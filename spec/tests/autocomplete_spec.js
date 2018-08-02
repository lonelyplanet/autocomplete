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
        expect(instance.$wrapper).toHaveClass("ohdeer", "autocomplete");
      });

      it("should have results div.", function() {
        expect(instance.$results).toExist();
      });

    });

    describe("The display of results", function() {

      describe("Render", function() {

        it("should render items from template", function() {
          instance.populateResults([
            { text: "howdy" },
            { text: "boss", disabled: true }
          ]);

          expect(instance.$list.html()).not.toHaveLength(0);
          expect(instance.$items.eq(0)).toHaveText("howdy");
          expect(instance.$items.eq(1)).toHaveText("boss");
          expect(instance.$items.eq(0)).toHaveClass(instance.classes.item);
          expect(instance.$items.eq(1)).toHaveClass(instance.classes.disabled);
        });

        it("should render empty template if defined & results empty", function() {
          instance.config.templates.empty = "No matches found";
          instance.populateResults([]);

          expect(instance.$items).toHaveLength(1);
          expect(instance.$items).toHaveText("No matches found");
          expect(instance.$items).toHaveClass(instance.classes.empty);
        });

        it("should highlight first result if forceSelection is enabled", function() {
          instance.config.forceSelection = true;
          instance.populateResults([ { text: "howdy" } ]);

          expect(instance.$items.eq(0)).toHaveClass(instance.classes.highlighted);
        });
      });

      describe("Show", function() {

        beforeEach(function() {
          spyOn(instance, "resetHighlightedResult").and.callThrough();
          spyOn(instance.$el, "is").and.returnValue(true);
          spyOn(instance.$items, "length").and.returnValue(3);
        });

        it("should early return if results are already displayed", function() {
          instance.areResultsDisplayed = true;
          instance.showResults();

          expect(instance.resetHighlightedResult).not.toHaveBeenCalled();
        });

        it("should highlight first result if forceSelection is enabled", function() {
          instance.config.forceSelection = true;
          instance.populateResults([ { text: "howdy" } ]);
          instance.hideResults();
          instance.showResults();

          expect(instance.$items.eq(0)).toHaveClass(instance.classes.highlighted);
        });

        it("should call config.onBeforeShow() if defined", function() {
          instance.config.onBeforeShow = function() {};
          spyOn(instance.config, "onBeforeShow");
          instance.showResults();

          expect(instance.config.onBeforeShow).toHaveBeenCalled();
        });

        it("should add 'visible' class", function() {
          instance.showResults();

          expect(instance.$wrapper).toHaveClass(instance.classes.visible);
        });

        it("should set 'displayed' flag to true", function() {
          instance.areResultsDisplayed = false;
          instance.showResults();

          expect(instance.areResultsDisplayed).toBe(true);
        });

      });

      describe("Hide", function() {

        beforeEach(function() {
          instance.showResults();
        });

        it("should remove 'visible' class", function() {
          instance.hideResults();

          expect(instance.$wrapper).not.toHaveClass(instance.classes.visible);
        });

        it("should set 'displayed' flag to false", function() {
          instance.hideResults();

          expect(instance.areResultsDisplayed).toBe(false);
        });

      });

      describe("Clear", function() {

        beforeEach(function() {
          instance.$list.html("<li>some result</li>");
        });

        it("should empty $list html", function() {
          instance.clearResults();

          expect(instance.$list).toBeEmpty();
        });

        it("should call hideResults()", function() {
          spyOn(instance, "hideResults");
          instance.clearResults();

          expect(instance.hideResults).toHaveBeenCalled();
        });

      });

      describe("Highlight", function() {

        beforeEach(function() {
          instance.populateResults([
            { text: "result 1", disabled: true },
            { text: "result 2" }
          ]);
        });

        it("should add 'highlighted' class", function() {
          instance.itemIndex = 0;
          instance.highlightResult();
          expect(instance.$items.eq(0)).not.toHaveClass(instance.classes.highlighted);
        });

        it("shouldn't add 'highlighted' class if item is disabled", function() {
          instance.itemIndex = 1;
          instance.highlightResult();
          expect(instance.$items.eq(1)).toHaveClass(instance.classes.highlighted);
        });

      });

      describe("Select", function() {

        beforeEach(function() {

          instance.populateResults([
            { text: "robisaduck" },
            { text: "duckisarob" },
            { text: "nidala", disabled: true }
          ]);
        });

        it("should call config.onItem($item)", function() {
          spyOn(instance.config, "onItem");

          instance.showResults();
          instance.changeIndex("down");
          instance.changeIndex("down");
          instance.selectResult();

          expect(instance.config.onItem).toHaveBeenCalledWith(instance.$items.eq(1));
        });

        it("should set 'selected' flag to true", function() {
          instance.showResults();
          instance.changeIndex("down");
          instance.selectResult();

          expect(instance.isResultSelected).toBe(true);
        });

        it("should do nothing if item is disabled", function() {
          instance.showResults();
          instance.itemIndex = 2;
          instance.selectResult();

          expect(instance.isResultSelected).toBe(false);
        });
      });

      describe("with forceSelection enabled", function() {
        var e;

        beforeEach(function() {
          instance.config.forceSelection = true;
        });

        it("should clear input value if 'esc' is pressed", function() {
          spyOn(instance.$el, "val");
          e = $.Event("keydown");
          e.keyCode = 27;

          instance.areResultsDisplayed = true;
          instance.processSpecialKey(e);

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
          instance.isResultSelected = true;
          spyOn(instance.$el, "val");
          instance.$el.trigger(e);

          expect(instance.$el.val).not.toHaveBeenCalled();
        });

      });
    });

    describe("The user typing", function() {
      var e;

      beforeEach(function() {
        jasmine.clock().install();
      });

      afterEach(function() {
        jasmine.clock().uninstall();
      });

      it("shouldn't call fetch() if input is blank", function() {
        spyOn(instance, "fetch");
        instance.config.threshold = 0;
        instance.processTyping({ target: { value: "" } });

        expect(instance.fetch).not.toHaveBeenCalled();
      });

      it("shouldn't call fetch() if input length is shorter than threshold.", function() {
        spyOn(instance, "fetch");
        instance.config.threshold = 2;
        instance.processTyping({ target: { value: "Om" } });

        expect(instance.fetch).not.toHaveBeenCalled();
      });

      it("should add 'loading' class & call config.fetch()", function() {
        spyOn(instance.config, "fetch");
        instance.processTyping({ target: { value: "Omega3" } });
        jasmine.clock().tick(instance.config.debounceTime + 1);

        expect(instance.$wrapper).toHaveClass(instance.classes.loading);
        expect(instance.config.fetch).toHaveBeenCalled();
      });

      it("should remove 'loading' class when fetch is done", function() {
        instance.handleFetchDone([]);
        expect(instance.$wrapper).not.toHaveClass("is-loading");
      });

      it("should call populateResults(results), where results are trimmed to config.limit", function() {
        spyOn(instance, "populateResults");
        instance.config.limit = 1;
        instance.handleFetchDone([ { text: "bruh" }, { text: "sup" }]);

        expect(instance.populateResults).toHaveBeenCalledWith([ { text: "bruh" } ]);
      });

      it("should call showResults()", function() {
        spyOn(instance, "showResults");
        instance.handleFetchDone([ { text: "bruh" } ]);

        expect(instance.showResults).toHaveBeenCalled();
      });

      it("should call clearResults() if $list is empty.", function() {
        spyOn(instance, "clearResults");
        instance.config.templates.empty = null;
        instance.handleFetchDone([]);

        expect(instance.clearResults).toHaveBeenCalled();
      });

      describe("Arrows", function() {
        var e;

        beforeEach(function() {
          spyOn(instance, "highlightResult");
          spyOn(instance, "changeIndex").and.returnValue(true);
          spyOn(instance.$el, "is").and.returnValue(true);

          e = $.Event("keypress");
          instance.lastFetchedAt = 123;

          instance.handleFetchDone([ { text: "a" }, { text: "b" }, { text: "c" } ], 123);
        });

        it("calls highlightResult() on up/down arrows", function() {
          e.keyCode = 38;
          instance.processSpecialKey(e);
          e.keyCode = 40;
          instance.processSpecialKey(e);

          expect(instance.highlightResult).toHaveBeenCalled();
          expect(instance.highlightResult.calls.count()).toEqual(2);
        });

        it("calls highlightResult() on right/left arrows", function() {
          instance.config.useHorizontalNavKeys = true;
          instance.itemIndex = 0;

          e.keyCode = 37;
          instance.processSpecialKey(e);
          e.keyCode = 39;
          instance.processSpecialKey(e);

          expect(instance.highlightResult).toHaveBeenCalled();
          expect(instance.highlightResult.calls.count()).toEqual(2);
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
        });

        spyOn(instance, "search");

        e = $.Event("keyup");
        e.target = {
          value: "@ka @wa sa@ki @to\n@yo\n@ta",
          selectionStart: null
        };
      });

      describe("gets triggered word if it", function() {

        it("is at index 0", function() {
          e.target.selectionStart = 3;
          instance.processTyping(e);

          expect(instance.search).toHaveBeenCalledWith("@ka");
        });

        it("is surrounded with whitespace", function() {
          e.target.selectionStart = 7;
          instance.processTyping(e);

          expect(instance.search).toHaveBeenCalledWith("@wa");
        });

        it("ends with newline", function() {
          e.target.selectionStart = 17;
          instance.processTyping(e);

          expect(instance.search).toHaveBeenCalledWith("@to");
        });

        it("is surrounded by newlines", function() {
          e.target.selectionStart = 21;
          instance.processTyping(e);

          expect(instance.search).toHaveBeenCalledWith("@yo");
        });

        it("ends with eol", function() {
          e.target.selectionStart = e.target.value.length - 1;
          instance.processTyping(e);

          expect(instance.search).toHaveBeenCalledWith("@ta");
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

    describe("Navigating", function() {

      beforeEach(function() {
        instance.populateResults(data);
      });

      it("should be able to move up at index 0 & jump to last item.", function() {
        instance.itemIndex = 0;
        instance.changeIndex("up");

        expect(instance.itemIndex).toEqual(2);
      });

      it("should be able to move down at last index & jump to first item.", function() {
        instance.itemIndex = 2;
        instance.changeIndex("down");

        expect(instance.itemIndex).toEqual(0);
      });

      it("should move down if not at last item.", function() {
        instance.itemIndex = 1;
        instance.changeIndex("down");

        expect(instance.itemIndex).toEqual(2);
      });

      it("should move up if not at first item.", function() {
        instance.itemIndex = 1;
        instance.changeIndex("up");

        expect(instance.itemIndex).toEqual(0);
      });

      it("should return true if changed.", function() {
        instance.itemIndex = 1;

        expect(instance.changeIndex("up")).toBeTruthy();
      });

      it("should return false if not changed.", function() {
        instance.populateResults([ "a" ]);
        instance.itemIndex = 0;

        expect(instance.changeIndex("up")).toBeFalsy();
      });

      describe("when one result is disabled", function() {

        beforeEach(function() {
          instance.$items.eq(0).addClass(instance.classes.disabled);
        });

        it("skips 2 items", function() {
          instance.itemIndex = -1;

          instance.changeIndex("down");
          expect(instance.itemIndex).toEqual(1);

          instance.changeIndex("up");
          expect(instance.itemIndex).toEqual(2);
        });

      });

      describe("when all results are disabled", function() {

        beforeEach(function() {
          for (var i = 0; i < instance.$items.length; i++) {
            instance.$items.eq(i).addClass(instance.classes.disabled);
          }
        });

        it("returns false", function() {
          expect(instance.changeIndex("down")).toBe(false);
          expect(instance.changeIndex("up")).toBe(false);
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
