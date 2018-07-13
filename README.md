Autocomplete
============

An autocomplete widget. Built to be as reusable as possible, but hopefully flexible and simple enough to be used in different contexts.


Clone this repository. Run `npm install` and `bower install`. Then run `grunt dev`. This will start up a server at `localhost:8000` and will run jasmine tests. You'll be presented with a sample of this autocomplete (see screenshot). It is running on local data, and should give you a good feel of what this autocomplete does. Tailor it to your needs and use it in your own project!

![autocomplete](/autocomplete-example.png)

## Dependencies
* jQuery

## Usage
The Autocomplete widget is always instantiated with an html element. This element is expected to be an `input` element, as the user will type and be presented with a set of matched results. Other than the element, you will also want to set a threshold of characters that must be typed before the Autocomplete will start fetching results. By default this is set at 2, but you can override that. You can also limit the number of results displayed in the result list by using the `limit` config option. Search term can be triggered by chosen character (`triggerChar`) - you might want to use it f.e. for user mentions in `textarea` element. If you want to limit input value to fetched results only, use `forceSelection` option. `debounceTime` defines how long (after users stops typing) should Autocomplete wait before it calls `fetch` function.

```js
new Autocomplete({
  el: ".js-autocomplete-input",
  threshold: 2,
  limit: 5,
  triggerChar: "@",
  forceSelection: true,
  debounceTime: 200,
  ...
});
```

# Templating
You can pass a `templates` config option to the Autocomplete. `item` template is responsible for the results item display (feel free to put some html there). `value` template is rendered as `data-value` attribute in the result item node (see `onItem` function explanation below). `empty` template is rendered when `fetch` returns empty results array.
```js
new Autocomplete({
  ...
  templates: {
    item: "<strong>{{text}}</strong>",
    value: "{{text}}",
    empty: "No matches found"
  },
  ...
});
```
When creating the `item` / `value` template, variables are surrounded by double curly brackets, like `{{this}}`. No need to escape the html, the script will look through the html string and replace all variables in curly brackets with the values in your data.

Disabled items are supported - all you have to do is add `disabled: true` property to your item data you don't want to be clickable. That item will also be provided with extra class.

When fetching starts, `is-loading` class is added to the wrapper element. It's removed as soon as the results appear/fetching stops.

Once `new Autocomplete` is instantiated, it changes the original `<input type="text" />`. It wraps it in an `wrapper` div and appends a `result` div after.

```html
<div class="autocomplete">
  <input class="js-autocomplete-input" type="text" />
  <div class="autocomplete__results">
    <ul class="autocomplete__list">
      <li class="autocomplete__list__item" data-value="44">Mark</li>
      <li class="autocomplete__list__item autocomplete__list__item--highlighted" data-value="24">Daniel</li>
      <li class="autocomplete__liat__item autocomplete__list__item--disabled" data-value="42">Carrie</li>
    </ul>
  </div>
</div>
```

Base classes are fixed, but custom classes can still be added to each element via `extraClasses` config object.
Here's full list of elements & classes that can be extended:
```js
  ...
  classes: {
    wrapper:     "autocomplete",
    results:     "autocomplete__results",
    list:        "autocomplete__list",
    item:        "autocomplete__list__item",
    highlighted: "autocomplete__list__item--highlighted",
    disabled:    "autocomplete__list__item--disabled",
    empty:       "autocomplete__list__item--empty",
    searchTerm:  "autocomplete__list__item__search-term",
    loading:     "is-loading"
  },
  ...
```

## fetch(), and onItem() Explained
There are two custom functions which must be passed to this widget for it to be useful. They are explained below.

### fetch()
As a user is typing, the widget takes the string of typed text and passes it to this fetch function. When instantiating this widget you should create your own custom fetch() function. This function receives two arguments: `searchTerm` and a `callback`. The searchTerm will come as a string and you do with it whatever you want (ping an endpoint with an XHR request, iterate through local data, up to you). Whenever you are satisfied and have results, simply use `callback()` and pass it the array of results in JSON format.

**Local Example:**
```js
new Autocomplete({
  ...
  fetch: myFetch,
  ...
});


var myFetch = function(searchTerm, callback) {
  var results = [],
      mydata = [{name: "David", age: 2}, {name: "Mark", age: 4}],
      searchString = searchTerm.toLowerCase();
  for(var i = 0; i < mydata.length; i++) {
    if(mydata[i].name.toLowerCase().indexOf(searchString) != -1) {
      results.push(mydata[i]);
    }
  }
  callback(results);
};
```

**XHR Example:**
```js
new Autocomplete({
  ...
  fetch: myFetch,
  ...
});

var myFetch = function(searchTerm, callback) {
  var results = [];
  $.ajax({
    url: "http://www.mysite.com/endpoint/search?q=" + searchTerm
  }).done(function(data) {
    callback(data);
  });
};
```

### onItem()
Just as the fetch function gives you full control of how the data is fetched, this function gives you full control of what happens when a user **selects** a result in the autocomplete. The typical case is the input value is replaced by the value of the result. But sometimes you may want to do other things (set hidden variables in your form based on the `data-value` attribute of the list item).

This function is passed the DOM element (not the jQuery element, the actual DOM element) of the selected item, as well as the click event. So you are receiving exactly **one** list item that will be formatted just as you specified in the `renderTemplate()` function. `e.preventDefault()` and `e.stopPropagation()` have already been called on the event by the time you receive the `el`.

**Example:**
```js
new Autocomplete({
  ...
  onItem: myOnItem,
  ...
});

var myOnItem = function(el) {
  var selectedValue = $(el).data("value");
  $(".js-autocomplete-input").val(selectedValue);
}
```

## CSS
By default this should work without much styling, but here are some recommended, minimum styling options to set:

```css
.autocomplete__results {
  position: relative;
}
.autocomplete__list {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  margin: 0px;
  padding: 0px;
  border: 1px solid silver;
  background: white;
}
.autocomplete__list__item {
  border-bottom: 1px solid silver;
  background: white;
  cursor: pointer;
}
.autocomplete__list__item:last-child {
  border-bottom: 0px;
}
.autocomplete__list__item--disabled {
  color: gray;
  cursor: default
}
.autocomplete__list__item--highlighted {
  background: whitesmoke;
}
.autocomplete__list__item__search-term {
  background-color: yellow;
}

```
