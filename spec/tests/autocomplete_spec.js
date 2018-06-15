define([ "jquery", "autocomplete" ], function($, Autocomplete) {

  "use strict";

  describe("Autocomplete", function() {
    var instance, data;

    beforeEach(function() {
      data = [
        { text: "a" },
        { text: "b" },
        { text: "c" }
      ];
      setFixtures("<input id='js-autocomplete-test' />");
      instance = new Autocomplete({
        el: "#js-autocomplete-test",
        forceSelection: false,
        extraClasses: {
          wrapper: "ohdeer"
        }
      });
    });

    describe("The object", function() {

      it("should exist.", function() {
        expect(instance).toBeDefined();
      });

      it("should have a config.el attribute.", function() {
        expect(instance.config.el).toBeDefined();
      });

      it("should override the defauls with the user-generated options.", function() {
        expect(instance.config.el).toEqual("#js-autocomplete-test");
      });

      it("should have an empty array as the results.", function() {
        expect(instance.results).toEqual([]);
      });

    });

    describe("The DOM element", function() {

      it("should exist.", function() {
        expect(instance.$el).toExist();
      });

      it("should have autocomplete='off' attribute", function() {
        expect(instance.$el).toHaveAttr("autocomplete", "off");
      });

      it("should't have autocomplete attribute if $el is textarea", function() {
        setFixtures("<textarea class='js-autocomplete'></textarea>");
        var instanceOnTextarea = new Autocomplete({ el: ".js-autocomplete" });

        expect(instanceOnTextarea.$el).not.toHaveAttr("autocomplete");
      });

      it("should be wrapped in a div with the passed ID.", function() {
        expect(instance.$wrapper).toExist();
      });

      it("should add extra class to wrapper.", function() {
        expect(instance.$wrapper).toHaveClass("ohdeer");
      });

      it("should have results div.", function() {
        expect(instance.$results).toExist();
      });

    });

    describe("The display of results", function() {
      var el;

      beforeEach(function() {
        el = instance.$results;
      });

      it("should show results on showResults().", function() {
        instance.showResults();
        expect(el).toBeVisible();
      });

      it("should set displayed to true showResults().", function() {
        instance.displayd = false;
        instance.showResults();
        expect(instance.displayed).toBeTruthy();
      });

      it("should remove 'visible' class on hideResults().", function() {
        instance.hideResults();
        expect(instance.$el).not.toHaveClass(instance.classes.visible);
      });

      it("should clear all html on clearResults.", function() {
        instance.$list.html("<li>content</li>");
        instance.clearResults();
        expect(instance.$list).toBeEmpty();
      });

      it("should clear the global results array on clearResults.", function() {
        instance.results = [ 1, 2, 3 ];
        instance.clearResults();
        expect(instance.results).toEqual([]);
      });

      it("should hide results panel on clearResults.", function() {
        instance.showResults();
        instance.clearResults();
        expect(instance.$el).not.toHaveClass(instance.classes.visible);
      });

      it("should set displayed to false on hide results.", function() {
        instance.showResults();
        instance.hideResults();
        expect(instance.displayed).toBeFalsy();
      });

      it("should set the input's value on selectResult", function() {
        instance.results = [ { text: "robisaduck" } ];
        instance.showResults();
        instance.resultIndex = 0;
        instance.selectResult();
        expect($(instance.config.el).val()).toEqual("robisaduck");
      });

      it("should display empty results item if it's defined & nothing was found", function() {
        instance.config.templates.empty = "No matches found";
        instance.results = [];
        instance.showResults();
        expect(instance.$results.text()).toBe("No matches found");
      });

      it("shouldn't call selectResult() if disabled item is clicked", function() {
        var $disabledItem = $(instance.config.templates.resultsItem).addClass("is-disabled");
        spyOn(instance, "selectResult");
        instance.$results.html($disabledItem);
        $disabledItem.trigger("mousedown");

        expect(instance.selectResult).not.toHaveBeenCalled();
      });

      describe("with forceSelection enabled", function() {
        var e;

        beforeEach(function() {
          instance.config.forceSelection = true;
        });

        it("should call .changeIndex() when .showResults() is called", function() {
          spyOn(instance, "changeIndex");
          instance.showResults();

          expect(instance.changeIndex).toHaveBeenCalled();
        });

        it("should clear input value if 'esc' is pressed", function() {
          spyOn(instance.$el, "val");
          e = $.Event("keydown");
          e.keyCode = 27;

          instance.displayed = true;
          instance.handleSpecialKey(e);

          expect(instance.$el.val).toHaveBeenCalledWith("");
        });

        it("should clear input if e.relatedTarget is 'null' (for ex. mouseclick on empty area)", function() {
          e = $.Event("blur");
          e.relatedTarget = null;
          spyOn(instance.$el, "val");
          instance.$el.trigger(e);

          expect(instance.$el.val).toHaveBeenCalledWith("");
        });

        it("shouldn't clear input if item has been previously selected", function() {
          e = $.Event("blur");
          e.relatedTarget = null;
          instance.selected = true;
          spyOn(instance.$el, "val");
          instance.$el.trigger(e);

          expect(instance.$el.val).not.toHaveBeenCalled();
        });

      });
    });

    describe("The user typing", function() {
      var e;

      it("should reset index when searching.", function() {
        instance.processSearch("test search");
        expect(instance.resultIndex).toEqual(-1);
      });

      it("should not fetch results if input is blank.", function() {
        spyOn(instance, "debounceSearch");
        instance.config.threshold = 0;
        instance.searchTerm = "o";
        instance.handleTyping({ target: { value: "" } });
        expect(instance.debounceSearch).not.toHaveBeenCalled();
      });

      it("should not fetch results if input length is less than threshold.", function() {
        spyOn(instance, "debounceSearch");
        instance.config.threshold = 2;
        instance.searchTerm = "Oo";
        instance.handleTyping({ target: { value: "O" } });
        expect(instance.debounceSearch).not.toHaveBeenCalled();
      });

      it("should add loadingClass & fetch results if searchTerm.length >= threshold and different from previous input value", function() {
        instance.config.threshold = 2;
        spyOn(instance, "callFetch");
        spyOn(instance.$el, "val").and.returnValue("f");
        instance.processSearch("fr");
        expect(instance.$wrapper).toHaveClass(instance.classes.loading);
        expect(instance.callFetch).toHaveBeenCalled();
      });

      it("should remove loadingClass when .callFetch() is called", function() {
        instance.config.fetch = function(searchTerm, cb) { cb([]); };
        instance.callFetch();
        expect(instance.$wrapper).not.toHaveClass("is-loading");
      });

      it("should clear results if the input is empty.", function() {
        spyOn(instance, "clearResults");
        instance.searchTerm = "s";
        instance.handleTyping({ target: { value: "" }});
        expect(instance.clearResults).toHaveBeenCalled();
      });

      describe("Arrows", function() {
        var e;

        beforeEach(function() {
          spyOn(instance, "highlightResult");
          spyOn(instance, "changeIndex").and.returnValue(true);

          e = $.Event("keypress");
          instance.results = [ "a", "b", "c" ];
          instance.displayed = true;
        });

        it("calls .highlightResult() on up/down keypress", function() {
          e.keyCode = 38;
          instance.handleSpecialKey(e);
          e.keyCode = 40;
          instance.handleSpecialKey(e);

          expect(instance.highlightResult).toHaveBeenCalled();
          expect(instance.highlightResult.calls.count()).toEqual(2);
        });

        it("doesn't call .highlightResult() on left/right keypress if nothing yet highlighted", function() {
          e.keyCode = 37;
          instance.handleSpecialKey(e);
          e.keyCode = 39;
          instance.handleSpecialKey(e);

          expect(instance.highlightResult).not.toHaveBeenCalled();
        });

        it("calls .highlightResult() on left/right keypress if anything highlighted", function() {
          instance.resultIndex = 1;

          e.keyCode = 37;
          instance.handleSpecialKey(e);
          e.keyCode = 39;
          instance.handleSpecialKey(e);

          expect(instance.highlightResult).toHaveBeenCalled();
          expect(instance.highlightResult.calls.count()).toEqual(2);
        });

      });

      describe("with forceSelection enabled", function() {

        it("should restore input value if user changes it and blurs input before selection", function() {
          spyOn(instance.$el, "val");
          e = $.Event("blur");
          e.target = { value: "foo" };
          instance.config.forceSelection = true;
          instance.searchTerm = "foom";
          instance.selected = true;

          instance.$el.trigger(e);
          expect(instance.$el.val).toHaveBeenCalledWith("foom");
        });

      });
    });

    describe("Typing with triggerChar defined", function() {

      var e;

      beforeEach(function() {
        instance = new Autocomplete({
          el: "#js-autocomplete-test",
          threshold: 1,
          triggerChar: "@",
          precedeWithSpace: false
        });
        instance.searchTerm = "";
        e = $.Event("keyup");
        e.target = {
          value: "@ka @wa sa@ki @to\n@yo\n@ta",
          selectionStart: null
        };
      });

      describe("gets triggered word if it", function() {

        it("is at index 0", function() {
          e.target.selectionStart = 3;
          instance.$el.trigger(e);

          expect(instance.searchTerm).toEqual("@ka");
        });

        it("is surrounded with whitespace", function() {
          e.target.selectionStart = 7;
          instance.$el.trigger(e);

          expect(instance.searchTerm).toEqual("@wa");
        });

        it("ends with newline", function() {
          e.target.selectionStart = 17;
          instance.$el.trigger(e);

          expect(instance.searchTerm).toEqual("@to");
        });

        it("is surrounded by newlines", function() {
          e.target.selectionStart = 21;
          instance.$el.trigger(e);

          expect(instance.searchTerm).toEqual("@yo");
        });

        it("ends with eol", function() {
          e.target.selectionStart = e.target.value.length - 1;
          instance.$el.trigger(e);

          expect(instance.searchTerm).toEqual("@ta");
        });
      });

      describe("doesn't get triggered word if it", function() {

        it("is preceded by any character - not whitespace of newline", function() {
          e.target.selectionStart = 13;
          instance.$el.trigger(e);

          expect(instance.searchTerm).toEqual("");
        });
      });
    });

    describe("The fetching of results", function() {

      it("shouldn't change the global result set if nothing returned.", function() {
        instance.results = [ 1 ];
        spyOn(instance.config, "fetch").and.returnValue([]);
        instance.callFetch("fra");
        expect(instance.results).toEqual([ 1 ]);
      });

    });

    describe("Rendering results", function() {

      it("should return properly rendered item element.", function() {
        instance.results = [ { text: "Ben" } ];
        instance.processTemplate();
        expect(instance.$items[0].outerHTML.replace(/\"/g, "\'"))
          .toEqual("<div class='autocomplete__list__item' data-value='Ben'><strong>Ben</strong></div>");
      });

      it("calling populateResults() should fill the list div.", function() {
        instance.results = [ 1, 2, 3 ];
        instance.populateResults();
        expect(instance.$list).not.toBeEmpty();
      });

    });

    describe("Navigating results", function() {

      beforeEach(function() {
        instance.results = data;
        instance.processTemplate();
      });

      it("should be able to move up at index 0 & jump to last item.", function() {
        instance.resultIndex = 0;
        instance.changeIndex("up");

        expect(instance.resultIndex).toEqual(2);
      });

      it("should be able to move down at last index & jump to first item.", function() {
        instance.resultIndex = 2;
        instance.changeIndex("down");

        expect(instance.resultIndex).toEqual(0);
      });

      it("should move down if not at last item.", function() {
        instance.resultIndex = 1;
        instance.changeIndex("down");

        expect(instance.resultIndex).toEqual(2);
      });

      it("should move up if not at first item.", function() {
        instance.resultIndex = 1;
        instance.changeIndex("up");

        expect(instance.resultIndex).toEqual(0);
      });

      it("should return true if changed.", function() {
        instance.resultIndex = 1;

        expect(instance.changeIndex("up")).toBeTruthy();
      });

      it("should return false if not changed.", function() {
        instance.results = [ "a" ];
        instance.resultIndex = 0;

        expect(instance.changeIndex("up")).toBeFalsy();
      });

      describe("when one result is disabled", function() {

        beforeEach(function() {
          instance.results[0].disabled = true;
          instance.processTemplate();
        });

        it("skips 2 items", function() {
          instance.resultIndex = -1;

          instance.changeIndex("down");
          expect(instance.resultIndex).toEqual(1);

          instance.changeIndex("up");
          expect(instance.resultIndex).toEqual(2);
        });

      });

      describe("when all results are disabled", function() {

        beforeEach(function() {
          for (var i = 0; i < instance.results.length; i++) {
            instance.results[i].disabled = true;
          }
          instance.processTemplate();
        });

        it("returns false", function() {
          expect(instance.changeIndex("down")).toBeFalsy();
          expect(instance.changeIndex("up")).toBeFalsy();
        });

      });
    });

    describe("Results behaviour on touch events", function() {
      var $item;

      beforeEach(function() {
        spyOn(instance, "highlightResult");
        spyOn(instance, "selectResult");

        instance.$results.append("<div class='" + instance.classes.item + "'>");
        $item = instance.$results.find("." + instance.classes.item);
      });

      it("highlights item on 'touchstart'", function() {
        $item.trigger("touchstart");

        expect(instance.highlightResult).toHaveBeenCalled();
      });

      it("doesn't select result if 'touchmove' has been triggered", function() {
        $item
          .trigger("touchstart")
          .trigger("touchmove")
          .trigger("touchend");

        expect(instance.selectResult).not.toHaveBeenCalled();
      });

      it("selects result if 'touchmove' hasn't been triggered", function() {
        $item
          .trigger("touchstart")
          .trigger("touchend");

        expect(instance.selectResult).toHaveBeenCalled();
      });

    });
  });
});
