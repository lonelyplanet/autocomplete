define([ "jquery" ], function($) {

  "use strict";

  var defaults = {
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
      displayed: false,
      selected: false,
      typingTimer: null,
      resultIndex: -1,
      specialKeys: {
        9: "tab",
        27: "esc",
        13: "enter",
        38: "up",
        40: "down",
        37: "left",
        39: "right"
      },
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
    this.config.threshold < 1 && (this.config.threshold = 1);

    // if 'value' template is undefined, use 'item' template
    !this.config.templates.value && (this.config.templates.value = this.config.templates.item);

    // if custom fetch/onItem is undefined, use default functions
    !this.config.fetch && (this.config.fetch = this.defaultFetch);
    !this.config.onItem && (this.config.onItem = $.proxy(this.defaultOnItem, this));

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
    var _this = this,
        touchmoved = false,
        itemSelector = "." + this.classes.item.replace(/ /g, ".");

    this.$el
      .on("keyup click", $.proxy(this.processTyping, this))
      .on("keydown", $.proxy(this.processSpecialKey, this))
      .on("blur", function(e) {
        if (_this.config.forceSelection) {
          e.target.value != _this.searchTerm && _this.$el.val(_this.searchTerm);
          !_this.selected && _this.$el.val("");
        }
        _this.clearResults();
      });

    // 'blur' fires before 'click' so we have to use 'mousedown'
    this.$results
      .on("mousedown touchend", itemSelector, function(e) {
        if (!touchmoved) {
          e.preventDefault();
          e.stopPropagation();
          _this.selectResult();
        }
      })
      .on("mouseenter touchstart", itemSelector, function() {
        _this.resultIndex = $(this).index();
        _this.highlightResult();
        touchmoved = false;
      })
      .on("touchmove", itemSelector, function() {
        touchmoved = true;
      });

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
    this.displayed = true;
    this.resultIndex = -1;

    // highlight first item if forceSelection
    if (this.config.forceSelection) {
      this.changeIndex("down") && this.highlightResult();
    }
  };

  Autocomplete.prototype.hideResults = function() {
    this.$wrapper.removeClass(this.classes.visible);
    this.displayed = false;
  };

  Autocomplete.prototype.populateResults = function() {
    this.processTemplate();
    this.$list.html(this.$items);
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
      this.selected = true;
      this.config.onItem($item); // pass actual DOM element to onItem()
      this.searchTerm = this.$el.val();
      this.clearResults();
    }
  };

  Autocomplete.prototype.clearResults = function() {
    this.results = [];
    this.$list.html(null);
    this.resultIndex = -1;
    this.hideResults();
  };

  Autocomplete.prototype.callFetch = function() {
    var _this = this,
        limit = this.config.limit;

    this.config.fetch(this.searchTerm, function(results) {
      if (!!results) {
        _this.results = limit > 0 ? results.slice(0, limit) : results;
        if ((!!_this.config.templates.empty || results.length > 0) && _this.$el.is(":focus")) {
          _this.showResults();
        } else {
          _this.clearResults();
        }
      }
      _this.$wrapper.removeClass(_this.classes.loading);
    });
  };

  Autocomplete.prototype.getTriggeredValue = function(e) {
    var referenceIndex = e.target.selectionStart - 1,
        fullValue = e.target.value,
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

  Autocomplete.prototype.processTyping = function(e) {
    var currentInputVal = this.config.triggerChar ? this.getTriggeredValue(e) : $.trim(e.target.value);

    if (this.searchTerm != currentInputVal) {
      this.searchTerm = currentInputVal;
      this.selected = false;
      if (this.searchTerm.length && this.searchTerm.length >= this.config.threshold) {
        this.debounceSearch();
      } else {
        this.clearResults();
      }
    }
  };

  Autocomplete.prototype.debounceSearch = function() {
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout($.proxy(this.processSearch, this), this.config.debounceTime);
  };

  Autocomplete.prototype.processSearch = function() {
    this.$wrapper.addClass(this.classes.loading);
    this.callFetch();
  };

  Autocomplete.prototype.currentItemDisabled = function() {
    return this.$items.eq(this.resultIndex).hasClass(this.classes.disabled);
  };

  Autocomplete.prototype.allItemsDisabled = function() {
    return !this.$items.not("." + this.classes.disabled).length;
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

    if (resultsLength && !this.allItemsDisabled()) {
      switch (direction) {
        case "up": {
          this.decreaseIndex();
          while (this.currentItemDisabled() && i < resultsLength) {
            this.decreaseIndex();
            i++;
          }
          break;
        }
        case "down": {
          this.increaseIndex();
          while (this.currentItemDisabled() && i < resultsLength) {
            this.increaseIndex();
            i++;
          }
          break;
        }
      }
    }
    return this.resultIndex != tmpIndex;
  };

  Autocomplete.prototype.processSpecialKey = function(e) {
    var keyName = this.specialKeys[e.keyCode],
        indexChanged = false,
        anyResultHighlighted = this.resultIndex > -1,
        anyResultsAvailable = !!this.results.length;

    clearTimeout(this.typingTimer);

    if (this.displayed) {
      switch (keyName) {
        case "up":
        case "down": {
          if (anyResultsAvailable) {
            e.preventDefault();
            indexChanged = this.changeIndex(keyName);
          }
          break;
        }
        case "left":
        case "right": {
          if (anyResultHighlighted) {
            e.preventDefault();
            indexChanged = this.changeIndex(keyName == "left" ? "up" : "down");
          }
          break;
        }
        case "enter":
        case "tab": {
          if (anyResultHighlighted) {
            e.preventDefault();
            this.selectResult();
          }
          break;
        }
        case "esc": {
          e.preventDefault();
          this.config.forceSelection && this.$el.val("");
          this.clearResults();
          break;
        }
      }
    }

    indexChanged && this.highlightResult();
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
    words = $.grep(words, function(word, i) {
      return word !== "";
    });
    words = $.map(words, function(word, i) {
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
