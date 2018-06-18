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
    extraClasses: {}, // extend default classes (see lines 38-46)
    fetch: undefined,
    onItem: undefined,
    searchTermHighlight: true
  };

  function Autocomplete(args) {
    $.extend(this, {
      config: $.extend(true, {}, defaults, args),
      results: [],
      searchTerm: "",
      typingTimer: null,
      resultIndex: -1,
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

    // turn off native browser autocomplete feature unless it's textarea
    !this.$el.is("textarea") && this.$el.attr("autocomplete", "off");

    // bind event handlers
    this.handleTyping = $.proxy(this.handleTyping, this);
    this.handleSpecialKey = $.proxy(this.handleSpecialKey, this);
    this.handleBlur = $.proxy(this.handleBlur, this);
    this.handleFocus = $.proxy(this.handleFocus, this);
    this.handleHighlight = $.proxy(this.handleHighlight, this);
    this.handleSelect = $.proxy(this.handleSelect, this);
    this.handleTouchMove = $.proxy(this.handleTouchMove, this);
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
      .on("keyup click", this.handleTyping)
      .on("keydown", this.handleSpecialKey)
      .on("blur", this.handleBlur)
      .on("focus", this.handleFocus);

    this.$results
      .on("mouseenter touchstart", itemSelector, this.handleHighlight)
      // 'blur' fires before 'click' so we have to use 'mousedown'
      .on("mousedown touchend", itemSelector, this.handleSelect)
      .on("touchmove", itemSelector, this.handleTouchMove);
  };

  // -------------------------------------------------------------------------
  // Handle events
  // -------------------------------------------------------------------------

  Autocomplete.prototype.handleTyping = function(event) {
    var value = event.target.value,
        isTriggered = !!this.config.triggerChar,
        nextSearchTerm = isTriggered ? this.getTriggeredValue(event) : value;

    if (this.searchTerm != nextSearchTerm) {
      this.searchTerm = nextSearchTerm;
      this.isResultSelected = false;
      if (this.searchTerm.length && this.searchTerm.length >= this.config.threshold) {
        this.search();
      } else {
        this.clearResults();
      }
    }
  };

  Autocomplete.prototype.handleSpecialKey = function(event) {
    var keyName = SPECIAL_KEYS[event.keyCode],
        hasResultIndexChanged = false,
        isResultHighlighted = this.resultIndex > -1,
        isResultAvailable = !!this.results.length;

    clearTimeout(this.typingTimer);

    if (this.areResultsDisplayed) {
      switch (keyName) {
        case "up":
        case "down": {
          if (isResultAvailable) {
            event.preventDefault();
            hasResultIndexChanged = this.changeIndex(keyName);
          }
          break;
        }
        case "left":
        case "right": {
          if (isResultHighlighted) {
            event.preventDefault();
            hasResultIndexChanged = this.changeIndex(keyName == "left" ? "up" : "down");
          }
          break;
        }
        case "enter":
        case "tab": {
          if (isResultHighlighted) {
            event.preventDefault();
            this.selectResult();
            this.hideResults();
          }
          break;
        }
        case "esc": {
          event.preventDefault();
          this.config.forceSelection && this.$el.val("");
          this.clearResults();
          break;
        }
      }
    }

    hasResultIndexChanged && this.highlightResult();
  };

  Autocomplete.prototype.handleBlur = function(event) {
    if (this.config.forceSelection) {
      if (event.target.value != this.searchTerm) {
        this.$el.val(this.searchTerm);
      }
      if (!this.isResultSelected) {
        this.$el.val("");
      }
    }

    this.hideResults();
  };

  Autocomplete.prototype.handleFocus = function() {
    this.$el.val().length && this.search();
  };

  Autocomplete.prototype.handleHighlight = function(event) {
    this.resultIndex = $(event.currentTarget).index();
    this.highlightResult();
    this.hasTouchmoved = false;
  };

  Autocomplete.prototype.handleSelect = function(event) {
    if (this.hasTouchmoved) return;

    event.preventDefault();
    event.stopPropagation();

    this.selectResult();
    this.clearResults();
  };

  Autocomplete.prototype.handleTouchMove = function() {
    this.hasTouchmoved = true;
  };

  Autocomplete.prototype.handleFetchDone = function(results) {
    var limit = this.config.limit,
        hasEmptyTemplate = !!this.config.templates.empty;

    if (!!results) {
      this.results = limit > 0 ? results.slice(0, limit) : results;

      if ((hasEmptyTemplate || results.length > 0) && this.$el.is(":focus")) {
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

    this.$wrapper = this.$el.closest("." + this.classes.wrapper.replace(/ /g, "."));
    this.$results = $("." + this.classes.results.replace(/ /g, "."), this.$wrapper);
    this.$list = $("." + this.classes.list.replace(/ /g, "."), this.$wrapper);
  };

  Autocomplete.prototype.showResults = function() {
    this.populateResults();

    if (this.results.length > 0 && this.config.searchTermHighlight) {
      // highlight search term
      this.$items.highlight($.trim(this.searchTerm).split(" "), {
        element: "span",
        className: this.classes.searchTerm
      });
    }

    this.$wrapper.addClass(this.classes.visible);
    this.areResultsDisplayed = true;
    this.resultIndex = -1;

    // highlight first item if forceSelection
    if (this.config.forceSelection) {
      this.changeIndex("down") && this.highlightResult();
    }
  };

  Autocomplete.prototype.hideResults = function() {
    this.$wrapper.removeClass(this.classes.visible);
    this.areResultsDisplayed = false;
  };

  Autocomplete.prototype.populateResults = function() {
    this.processTemplate();
    this.$list.html(this.$items);
  };

  Autocomplete.prototype.clearResults = function() {
    this.results = [];
    this.$list.html(null);
    this.resultIndex = -1;
    this.hideResults();
  };

  Autocomplete.prototype.highlightResult = function() {
    var $currentItem = this.$items.eq(this.resultIndex);
    // unless disabled, highlight result by adding class
    this.$items.removeClass(this.classes.highlighted);
    if (!$currentItem.hasClass(this.classes.disabled)) {
      $currentItem.addClass(this.classes.highlighted);
    }
  };

  Autocomplete.prototype.selectResult = function() {
    var $item = this.$items.eq(this.resultIndex);

    if (!$item.hasClass(this.classes.disabled)) {
      this.isResultSelected = true;
      this.config.onItem($item); // pass actual DOM element to onItem()
      this.searchTerm = this.$el.val();
    }
  };

  Autocomplete.prototype.processTemplate = function() {
    var len = this.results.length;

    this.$items = $();

    if (!len && !!this.config.templates.empty) {
      $.merge(this.$items, this.templates.$empty.html(this.config.templates.empty));
    } else {
      for (var i = 0; i < len; i++) {
        $.merge(this.$items, this.renderTemplate(this.templates.$item, this.results[i]));
      }
    }
  };

  Autocomplete.prototype.renderTemplate = function($item, obj) {
    var template = $item[0].outerHTML;

    for (var key in obj) {
      template = template.replace(new RegExp("{{" + key + "}}", "gm"), obj[key]);
    }

    $item = $(template);
    obj.disabled && obj.disabled === true && $item.addClass(this.classes.disabled);

    return $item;
  };

  Autocomplete.prototype.getTriggeredValue = function(event) {
    var referenceIndex = event.target.selectionStart - 1,
        fullValue = event.target.value,
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

    return triggeredValue.charAt(0) == this.config.triggerChar ? triggeredValue : "";
  };

  Autocomplete.prototype.search = function() {
    var debounceTime = this.config.debounceTime;

    this.$wrapper.addClass(this.classes.loading);

    if (debounceTime) {
      clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(this.fetch, debounceTime);
    } else {
      this.fetch();
    }
  };

  Autocomplete.prototype.fetch = function() {
    this.config.fetch(this.searchTerm, this.handleFetchDone);
  };

  Autocomplete.prototype.increaseIndex = function() {
    this.resultIndex++;
    this.resultIndex == this.results.length && (this.resultIndex = 0);
  };

  Autocomplete.prototype.decreaseIndex = function() {
    this.resultIndex <= 0 && (this.resultIndex = this.results.length);
    this.resultIndex--;
  };

  Autocomplete.prototype.changeIndex = function(direction) {
    var resultsLength = this.results.length,
        tmpIndex = this.resultIndex,
        i = 0;

    if (resultsLength && !this.isEveryItemDisabled()) {
      switch (direction) {
        case "up": {
          this.decreaseIndex();
          while (this.isCurrentItemDisabled() && i < resultsLength) {
            this.decreaseIndex();
            i++;
          }
          break;
        }
        case "down": {
          this.increaseIndex();
          while (this.isCurrentItemDisabled() && i < resultsLength) {
            this.increaseIndex();
            i++;
          }
          break;
        }
      }
    }
    return this.resultIndex != tmpIndex;
  };

  Autocomplete.prototype.isCurrentItemDisabled = function() {
    return this.$items.eq(this.resultIndex).hasClass(this.classes.disabled);
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
