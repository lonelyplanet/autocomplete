define([ "jquery" ], function($) {

  "use strict";

  var SPECIAL_KEYS = {
    9: "tab",
    27: "esc",
    13: "enter",
    38: "up",
    40: "down",
    37: "left",
    39: "right"
  },

  defaults = {
    el: ".js-autocomplete",
    threshold: 2,
    limit: 5,
    forceSelection: false,
    debounceTime: 200,
    triggerChar: null,
    templates: {
      item: "<strong>{{text}}</strong>",
      value: "{{text}}", // appended to item as 'data-value' attribute
      empty: "No matches found"
    },
    extraClasses: {}, // extend default CSS classes
    fetch: undefined,
    onItem: undefined,
    onBeforeShow: undefined,
    searchTermHighlight: true,
    useHorizontalNavKeys: false
  };

  function Autocomplete(args) {
    $.extend(this, {
      config: $.extend(true, {}, defaults, args),
      results: [],
      searchTerm: "",
      typingTimer: null,
      itemIndex: -1,
      isResultSelected: false,
      areResultsDisplayed: false,
      classes: {
        wrapper:     "autocomplete",
        input:       "autocomplete__input",
        results:     "autocomplete__results",
        list:        "autocomplete__list",
        item:        "autocomplete__list__item",
        highlighted: "autocomplete__list__item--highlighted",
        disabled:    "autocomplete__list__item--disabled",
        empty:       "autocomplete__list__item--empty",
        searchTerm:  "autocomplete__list__item__search-term",
        loading:     "is-loading",
        visible:     "is-visible"
      },
    });

    // make sure threshold isn't lower than 1
    if (this.config.threshold < 1) {
      this.config.threshold = 1;
    }

    // if 'value' template is undefined, use 'item' template
    if (!this.config.templates.value) {
      this.config.templates.value = this.config.templates.item;
    }

    // if custom fetch/onItem is undefined, use default functions
    if (!this.config.fetch) {
      this.config.fetch = this.defaultFetch;
    }

    if (!this.config.onItem) {
      this.config.onItem = $.proxy(this.defaultOnItem, this);
    }

    // extend default classes
    for (var key in this.classes) {
      if (this.config.extraClasses[key]) {
        this.classes[key] = this.classes[key].concat(" ", this.config.extraClasses[key]);
      }
    }

    // define templates for all elements
    this.templates = {
      $wrapper: $("<div>").addClass(this.classes.wrapper),
      $results: $("<div>").addClass(this.classes.results),
      $list: $("<div>").addClass(this.classes.list),
      $item:
        $("<div>")
          .addClass(this.classes.item)
          .html(this.config.templates.item)
          .attr("data-value", this.config.templates.value),
      $empty:
        $("<div>")
          .addClass(this.classes.item.concat(" ", this.classes.empty, " ", this.classes.disabled))
          .html(this.config.templates.empty)
    };

    this.$el = $(this.config.el);
    this.$list = $();
    this.$items = $();

    // turn off native browser autocomplete feature unless it's textarea
    !this.$el.is("textarea") && this.$el.attr("autocomplete", "off");

    // bind event handlers
    this.handleInput = $.proxy(this.handleInput, this);
    this.handleBlur = $.proxy(this.handleBlur, this);
    this.handleItemHover = $.proxy(this.handleItemHover, this);
    this.handleItemClick = $.proxy(this.handleItemClick, this);
    this.handleItemTouchMove = $.proxy(this.handleItemTouchMove, this);
    this.handleFetchDone = $.proxy(this.handleFetchDone, this);

    this.fetch = $.proxy(this.fetch, this);

    this.init();
  }

  Autocomplete.prototype.init = function() {
    this.wrapEl();
    this.listen();
  };

  // -------------------------------------------------------------------------
  // Subscribe to Events
  // -------------------------------------------------------------------------

  Autocomplete.prototype.listen = function() {
    var itemSelector = "." + this.classes.item.replace(/ /g, ".");

    this.$el
      .on("keyup keydown click focus", this.handleInput)
      .on("blur", this.handleBlur);

    this.$results
      .on("mouseenter touchstart", itemSelector, this.handleItemHover)
      // 'blur' fires before 'click' so we have to use 'mousedown'
      .on("mousedown touchend", itemSelector, this.handleItemClick)
      .on("touchmove", itemSelector, this.handleItemTouchMove);
  };

  // -------------------------------------------------------------------------
  // Handle events
  // -------------------------------------------------------------------------

  Autocomplete.prototype.handleInput = function(event) {
    if (event.type === "keydown") {
      if (SPECIAL_KEYS[event.keyCode] != undefined) {
        this.shouldProcessTyping = false;
        this.processSpecialKey(event);
      }
    } else if (event.type === "keyup" && this.shouldProcessTyping) {
      this.processTyping(event);
    } else {
      this.shouldProcessTyping = true;
    }
  };

  Autocomplete.prototype.handleBlur = function() {
    if (this.config.forceSelection && !this.isResultSelected) {
      this.$el.val("");
    }

    this.hideResults();
  };

  Autocomplete.prototype.handleItemHover = function(event) {
    this.itemIndex = $(event.currentTarget).index();
    this.highlightResult();
    this.hasTouchmoved = false;
  };

  Autocomplete.prototype.handleItemClick = function(event) {
    if (this.hasTouchmoved) return;

    event.preventDefault();
    event.stopPropagation();

    this.selectResult();
    this.hideResults();
  };

  Autocomplete.prototype.handleItemTouchMove = function() {
    this.hasTouchmoved = true;
  };

  Autocomplete.prototype.handleFetchDone = function(data, timestamp) {
    if (
      !!data && data.constructor === Array &&
      this.lastFetchedAt === timestamp
    ) {
      var limit = this.config.limit,
          results = limit > 0 ? data.slice(0, limit) : data;

      if (this.populateResults(results)) {
        this.showResults();
      } else {
        this.clearResults();
      }
    }

    this.$wrapper.removeClass(this.classes.loading);
  };

  // -------------------------------------------------------------------------
  // Functions
  // -------------------------------------------------------------------------

  Autocomplete.prototype.wrapEl = function() {
    this.$el
      .addClass(this.classes.input)
      .wrap(this.templates.$wrapper)
      .after(this.templates.$results.append(this.templates.$list));

    this.$wrapper = this.$el.parent();
    this.$results = this.$wrapper.children().last();
    this.$list = this.$results.children().first();
  };

  Autocomplete.prototype.processTyping = function(event) {
    var value = event.target.value,
        isTermTriggered = !!this.config.triggerChar,
        searchTerm = isTermTriggered ? this.getTriggeredValue(event) : value;

    this.search(searchTerm);
  };

  Autocomplete.prototype.processSpecialKey = function(event) {
    var keyName = SPECIAL_KEYS[event.keyCode],
        hasItemIndexChanged = false,
        canChangeItemIndex = !!this.$items.length && this.areResultsDisplayed,
        isNavigating = this.itemIndex > -1 && this.areResultsDisplayed;

    switch (keyName) {
      case "up":
      case "down":
      case "tab": {
        if (canChangeItemIndex) {
          keyName = keyName === "tab" ? "down" : keyName;
          hasItemIndexChanged = this.changeIndex(keyName);
          event.preventDefault();
        } else {
          this.shouldProcessTyping = false;
          this.hideResults();
        }
        break;
      }
      case "left":
      case "right": {
        if (this.config.useHorizontalNavKeys && isNavigating) {
          hasItemIndexChanged = this.changeIndex(
            keyName == "left" ? "up" : "down"
          );
          event.preventDefault();
        } else {
          this.shouldProcessTyping = false;
          this.hideResults();
        }
        break;
      }
      case "enter": {
        if (isNavigating) {
          this.selectResult();
          event.preventDefault();
        } else {
          this.shouldProcessTyping = false;
        }
        this.hideResults();
        break;
      }
      case "esc": {
        if (this.areResultsDisplayed) {
          if (this.config.forceSelection && !this.isResultSelected) {
            this.$el.val("");
            this.clearResults();
          } else {
            this.hideResults();
          }
          event.preventDefault();
        }
        break;
      }
    }

    if (hasItemIndexChanged) this.highlightResult();
  };

  Autocomplete.prototype.showResults = function() {
    if (
      this.areResultsDisplayed ||
      !this.$el.is(":focus") ||
      !this.$items.length
    ) return;

    this.resetHighlightedResult();

    if (this.config.onBeforeShow) {
      this.config.onBeforeShow(this.$wrapper);
    }

    this.$wrapper.addClass(this.classes.visible);
    this.areResultsDisplayed = true;
  };

  Autocomplete.prototype.hideResults = function() {
    this.$wrapper.removeClass(this.classes.visible);
    this.areResultsDisplayed = false;
  };

  Autocomplete.prototype.clearResults = function() {
    this.hideResults();
    this.$list.empty();
    this.searchTerm = "";
  };

  Autocomplete.prototype.highlightResult = function() {
    var $currentItem = this.$items.eq(this.itemIndex);

    // unless disabled, highlight result by adding class
    this.unhighlightResults();
    if (!$currentItem.hasClass(this.classes.disabled)) {
      $currentItem.addClass(this.classes.highlighted);
    }
  };

  Autocomplete.prototype.unhighlightResults = function() {
    this.$items.removeClass(this.classes.highlighted);
  };

  Autocomplete.prototype.resetHighlightedResult = function() {
    this.resetIndex();
    this.unhighlightResults();

    // highlight first item if forceSelection
    if (this.config.forceSelection) {
      this.changeIndex("down") && this.highlightResult();
    }
  };

  Autocomplete.prototype.selectResult = function() {
    var $item = this.$items.eq(this.itemIndex);

    if ($item.hasClass(this.classes.disabled)) return;

    this.config.onItem($item);
    this.isResultSelected = true;

    // Update searchTerm to match new input value unless triggered
    if (!this.config.triggerChar) {
      this.searchTerm = this.$el.val();
    }
  };

  Autocomplete.prototype.populateResults = function(results) {
    var resultsLength = results.length,
        $items = $();

    if (resultsLength > 0) {
      for (var i = 0; i < resultsLength; i++) {
        $.merge(
          $items,
          this.renderTemplate(this.templates.$item, results[i])
        );
      }

      if (this.config.searchTermHighlight) {
        $items.highlight(
          $.trim(this.searchTerm).split(" "),
          {
            element: "span",
            className: this.classes.searchTerm
          }
        );
      }
    } else if (this.config.templates.empty) {
      $.merge(
        $items,
        this.templates.$empty.html(this.config.templates.empty)
      );
    }

    this.$list.html($items);
    this.$items = $items;
    this.resetHighlightedResult();

    return !!$items.length;
  };

  Autocomplete.prototype.renderTemplate = function($item, obj) {
    var template = $item[0].outerHTML;

    for (var key in obj) {
      template = template.replace(new RegExp("{{" + key + "}}", "gm"), obj[key]);
    }

    $item = $(template);

    if (obj.disabled && obj.disabled === true) {
      $item.addClass(this.classes.disabled);
    }

    return $item;
  };

  Autocomplete.prototype.getTriggeredValue = function(event) {
    var triggerChar = this.config.triggerChar,
        input = event.target,
        referenceIndex = input.selectionStart - 1;

    if (referenceIndex === -1) return "";

    var fullValue = input.value,
        lastSpace = fullValue.lastIndexOf(" ", referenceIndex),
        nextSpace = fullValue.indexOf(" ", referenceIndex),
        lastNewline = fullValue.lastIndexOf("\n", referenceIndex),
        nextNewline = fullValue.indexOf("\n", referenceIndex),
        startIndex, endIndex, triggeredValue;

    startIndex = lastSpace > lastNewline ? lastSpace : lastNewline;

    if (nextSpace > -1 && nextNewline > -1) {
      endIndex = nextSpace < nextNewline ? nextSpace : nextNewline;
    } else if (nextSpace == -1 && nextNewline > -1) {
      endIndex = nextNewline;
    } else if (nextSpace > -1 && nextNewline == -1) {
      endIndex = nextSpace;
    }

    triggeredValue = fullValue.substring(startIndex + 1, endIndex);

    return triggeredValue.charAt(0) === triggerChar ? triggeredValue : "";
  };

  Autocomplete.prototype.search = function(searchTerm) {
    var debounceTime = this.config.debounceTime,
        fetchBound = function() { this.fetch(searchTerm); }.bind(this);

    if (debounceTime) {
      clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(fetchBound, debounceTime);
    } else {
      fetchBound();
    }
  };

  Autocomplete.prototype.fetch = function(searchTerm) {
    if (
      searchTerm.length &&
      searchTerm.length >= this.config.threshold
    ) {
      if (this.searchTerm != searchTerm) {
        this.searchTerm = searchTerm;
        this.isResultSelected = false;
        this.$wrapper.addClass(this.classes.loading);

        var now = Date.now(),
            boundHandleFetchDone = function(data) {
              this.handleFetchDone(data, now);
            }.bind(this);

        this.lastFetchedAt = now;
        this.config.fetch(this.searchTerm, boundHandleFetchDone);
      } else if (this.$items.length) {
        this.showResults();
      }
    } else {
      this.hideResults();
    }
  };

  Autocomplete.prototype.resetIndex = function() {
    this.itemIndex = -1;
  };

  Autocomplete.prototype.increaseIndex = function() {
    this.itemIndex++;

    if (this.itemIndex == this.$items.length) {
      this.itemIndex = 0;
    }
  };

  Autocomplete.prototype.decreaseIndex = function() {
    if (this.itemIndex <= 0) {
      this.itemIndex = this.$items.length;
    }

    this.itemIndex--;
  };

  Autocomplete.prototype.changeIndex = function(direction) {
    var itemsLength = this.$items.length,
        tmpIndex = this.itemIndex,
        i = 0;

    if (itemsLength && !this.isEveryItemDisabled()) {
      switch (direction) {
        case "up": {
          this.decreaseIndex();
          while (this.isCurrentItemDisabled() && i < itemsLength) {
            this.decreaseIndex();
            i++;
          }
          break;
        }
        case "down": {
          this.increaseIndex();
          while (this.isCurrentItemDisabled() && i < itemsLength) {
            this.increaseIndex();
            i++;
          }
          break;
        }
      }
    }

    return this.itemIndex != tmpIndex;
  };

  Autocomplete.prototype.isCurrentItemDisabled = function() {
    return this.$items.eq(this.itemIndex).hasClass(this.classes.disabled);
  };

  Autocomplete.prototype.isEveryItemDisabled = function() {
    return !this.$items.not("." + this.classes.disabled).length;
  };

  Autocomplete.prototype.defaultFetch = function(searchTerm, callback) {
    var results = [
      { text: "Jon" },
      { text: "Bon", disabled: true },
      { text: "Jovi" },
    ];

    callback($.grep(results, function(result) {
      return result.text.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
    }));
  };

  Autocomplete.prototype.defaultOnItem = function(item) {
    $(this.config.el).val($(item).data("value"));
  };

  // -------------------------------------------------------------------------
  // From jquery.highlight.js:
  // -------------------------------------------------------------------------

  $.extend({
    highlight: function(node, re, nodeName, className) {
      if (node.nodeType === 3) {
        var match = node.data.match(re);
        if (match) {
          var highlight = document.createElement(nodeName || "span");
          highlight.className = className || "highlight";
          var wordNode = node.splitText(match.index);
          wordNode.splitText(match[0].length);
          var wordClone = wordNode.cloneNode(true);
          highlight.appendChild(wordClone);
          wordNode.parentNode.replaceChild(highlight, wordNode);
          return 1; //skip added node in parent
        }
      } else if ((node.nodeType === 1 && node.childNodes) &&
                 !/(script|style)/i.test(node.tagName) &&
                 !(node.tagName === nodeName.toUpperCase() && node.className === className)) {
        for (var i = 0; i < node.childNodes.length; i++) {
          i += $.highlight(node.childNodes[i], re, nodeName, className);
        }
      }
      return 0;
    }
  });

  $.fn.highlight = function(words, options) {
    var settings = { className: "highlight", element: "span", caseSensitive: false, wordsOnly: false };
    $.extend(settings, options);

    if (words.constructor === String) {
      words = [ words ];
    }
    words = $.grep(words, function(word) {
      return word !== "";
    });
    words = $.map(words, function(word) {
      return word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    });
    if (words.length === 0) { return this; }

    var flag = settings.caseSensitive ? "" : "i",
        pattern = "(" + words.join("|") + ")";

    if (settings.wordsOnly) {
      pattern = "\\b" + pattern + "\\b";
    }

    var re = new RegExp(pattern, flag);

    return this.each(function() {
      $.highlight(this, re, settings.element, settings.className);
    });
  };

  return Autocomplete;
});
