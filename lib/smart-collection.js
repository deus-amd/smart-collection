/**
 * @class smart_collection.Collection
 */

var _ = require('underscore');
_.str = require('underscore.string');
var EventEmitter = require('events').EventEmitter;
var fuse = require('fusing');
var Next = require('./next');
var debug = require('debug')('smart-collection');

/**
 * Add a new item(s) at a specific position.
 * @method addAt
 * @param {Object|Array} items An array of objects or a single object.
 * @param {Number} index The position.
 * @fires add-before
 * @fires add
 * @fires add-after
 * @fires add-cancel
 * @fires add-resume
 * @chainable
 */
function addAt(items, index) {
  if (items) {
    if (_.isArray(items)) {
      _.each(items, function (item) {
        addAt.call(this, item, index);
        if (_.isNumber(index)) {
          index++;
        }
      }, this);
    } else {
      var item = items;
      var next = new Next(this, 'add', item, index);
      this.emit('add-before', this, item, next);
      next.done();
    }
  }
  return this;
}
/**
 * Add a new item(s) at top of the collection.
 * @method addFirst
 * @param {Object|Array} items An array of objects or a single object.
 * @fires add-before
 * @fires add
 * @fires add-after
 * @fires add-cancel
 * @fires add-resume
 * @chainable
 */
function addFirst(items) {
  return addAt.call(this, items, 0);
}
/**
 * Add a new item(s) at bottom of the collection.
 *
 * ## Example
 *
 * ```js
 * var Collection = require('smart-collection');
 * var coll = new Collection();
 *
 * coll.on('cancel', function (item) {
 *   console.log(item);       // {name: 'item1'}
 * });
 * coll.on('add-before', function (item, pause) {
 *   console.log('event');
 *   if (item.name === 'item1') {
 *     // break the add operation
 *     pause(true);
 *   }
 * });
 *
 * coll.add([{name: 'item1'}, {name: 'item2'}]);
 * coll.remove([{name: 'item1'}, {name: 'item2'}]);
 *
 * console.log(coll.items);   // {name: 'item2'}
 * ```
 *
 * @method add
 * @param {Object|Array} items An array of objects or a single object.
 * @fires add-before
 * @fires add
 * @fires add-after
 * @fires add-cancel
 * @fires add-resume
 * @chainable
 */
function add(items) {
  return addAt.call(this, items);
}
/**
 * @private
 * @ignore
 */
function doRemove(index) {
  if (~index) {
    var item = this.items[index];
    if (item) {
      var next = new Next(this, 'remove', item, index);
      this.emit('remove-before', this, item, next);
      next.done();
    }
  }
  return this;
}
/**
 * Remove an item(s) from the collection.
 * @method removeItem
 * @param {Number|Array|Object} obj The position of the item or an array of objects or a single object.
 * @fires remove-before
 * @fires remove
 * @fires remove-after
 * @fires remove-cancel
 * @fires remove-resume
 * @chainable
 * @private
 * @ignore
 */
function removeItem(obj) {
  var item;
  var index;
  if (_.isNumber(obj)) {
    index = obj;
    if (~index) {
      doRemove.call(this, index);
    }
  } else {
    var items = obj;
    if (items) {
      if (_.isArray(items)) {
        _.each(items, function (item) {
          removeItem.call(this, item);
        }, this);
      } else {
        item = items;
        index = _.indexOf(this.items, item);
        doRemove.call(this, index);
      }
    }
  }
  return this;
}
/**
 * Remove an item from the collection at a specific position.
 * @method removeAt
 * @param {Number} index The position of the item.
 * @fires remove-before
 * @fires remove
 * @fires remove-after
 * @fires remove-cancel
 * @fires remove-resume
 * @chainable
 */
function removeAt(index) {
  removeItem.call(this, index);
}
/**
 * Remove an item(s) from the collection.
 *
 * ## Example
 *
 * ```js
 * var Collection = require('smart-collection');
 * var coll = new Collection();
 *
 * coll.on('cancel', function (item) {
 *   console.log(item);       // {name: 'item1'}
 * });
 * coll.on('add-before', function (item) {
 *   console.log('event');
 *   if (item.name === 'item1') {
 *     // break the remove operation
 *     this.cancel = true;
 *   }
 * });
 *
 * coll.add([{name: 'item1'}, {name: 'item2'}]);
 * coll.remove([{name: 'item1'}, {name: 'item2'}]);
 *
 * console.log(coll.items);   // {name: 'item1'}
 * ```
 * @method remove
 * @param {Object|Array} items An array of objects or a single object.
 * @fires remove-before
 * @fires remove
 * @fires remove-after
 * @fires remove-cancel
 * @fires remove-resume
 * @chainable
 */
function remove(items) {
  return removeItem.call(this, items);
}
/**
 * Remove first item from the collection.
 * @method removeFirst
 * @fires remove-before
 * @fires remove
 * @fires remove-after
 * @fires remove-resume
 * @chainable
 */
function removeFirst() {
  return removeAt.call(this, 0);
}
/**
 * Remove last item from the collection.
 * @method removeLast
 * @fires remove-before
 * @fires remove
 * @fires remove-after
 * @fires remove-cancel
 * @fires remove-resume
 * @chainable
 */
function removeLast() {
  return removeAt.call(this, this.items.length - 1);
}
/**
 * Remove a specified number of items from the collection starting from a specific position.
 * @method removeRange
 * @param {Number} start The start position.
 * @param {Number} length The number of the items to remove.
 * @fires remove-before
 * @fires remove
 * @fires remove-after
 * @fires remove-cancel
 * @fires remove-resume
 * @chainable
 */
function removeRange(start, length) {
  if (length > 0) {
    var i;
    for (i = 0; i < length; i++) {
      removeAt.call(this, start);
    }
  }
  return this;
}
/**
 * Remove all items from the collection.
 * @method flush
 * @fires flush
 * @chainable
 */
function flush(){
  debug('flush');
  if (this.items.length > 0) {
    this.once('empty', function () {
      this.emit('flush', this);
    });
    while (this.items.length > 0) {
      this.removeLast();
    }
  } else {
    this.emit('flush', this);
  }
  return this;
}
/**
 * Add a view of the items in collection. The view are available as method of the collection.
 *
 * ## Example
 *
 *      // dependencies
 *      var Collection = require('smart-collection');
 *      // create new collection
 *      var c = new Collection('myCollection');
 *      // add three items
 *      c.add([
 *        { name: 'Sam' },
 *        { name: 'John' },
 *        { name: 'Path' }
 *      ]);
 *      // create a custom view
 *      c.addView('myView', function (){
 *        // the first two items
 *        return Array.prototype.slice.call(c.items, 0, 2);
 *      });
 *      console.log('myView', c.myView);    // [ { name: 'Sam' }, { name: 'John' } ]
 *
 * @param {String} name The name of the view.
 * @param {Function} fn The function used to compute the items into the view.
 * @chainable
 */
function addView(name, fn) {
  debug('add view "%s"', name);
//  debug('add view %o with function %o', (name ? name : '-'),
//    (fn ? _.str.prune(fn.toString()
//      .replace(/\s{2,}/g,' ')
//      .replace(/\r?\n|\r/g, ''), 50) : '-'));
  if (!_.isString(name)) {
    throw new Error('name required');
  }
  if (!_.isFunction(fn)) {
    throw new Error('function required');
  }
  this.readable(name, {
    get: function () {
      return fn.call(this);
    }
  }, true);
  return this;
}
/**
 * Add one or more [underscore](1) functions (for collections and arrays) and make a correspondent method into the collection.
 *
 * ## Example
 *
 *      // dependencies
 *      var Collection = require('smart-collection');
 *      // create new collection
 *      var c = new Collection('myCollection');
 *      // add an item
 *      c.add({ name: 'John' });
 *      // add two other items
 *      c.add([
 *        { name: 'Sam' },
 *        { name: 'Pat' }
 *      ]);
 *      // show all items
 *      console.log(c.all);  // [ { name: 'John' }, { name: 'Sam' }, { name: 'Pat' } ]
 *      // add a feature
 *      c.addFeature('filter');
 *      // add a view using a feature
 *      c.addView('myView', function () {
 *        // 'filter' is available as method
 *        return c.filter(function (item) {
 *          return item.name.length === 3;
 *        });
 *      });
 *      console.log(c.myView);  // [ { name: 'Sam' }, { name: 'Pat' } ]
 *
 * @param {String|Array} features The name or the array of the names of the required functions to add as methods.
 *
 * __NOTE__: the name of the feature (function) must be the same of the correspondent function in [underscore](1). The signature of the added method is the same of the correspondent function without the first parameter that is fixed to the entire collection of items.
 * @chainable
 *
 * [1]: http://underscorejs.org
 *
 */
function addFeature(features) {
  var addOne = function (feature) {
    debug('add feature %s', feature);
    if (!_.has(_, feature)) {
      throw new Error('feature "' + feature + '" not found');
    }
    function wrap() {
      var args = _.toArray(arguments);
      args.unshift(this.items);
      return _[feature].apply(this, args);
    }
    this.readable(feature, {
      get: function () {
        return wrap;
      }
    }, true);
  }.bind(this);
  if (features) {
    if (_.isArray(features)) {
      _.each(features, function (feature) {
        addOne(feature);
      });
    } else {
      addOne(features);
    }
  }
  return this;
}
/**
 * Add all [underscore](1) functions (for collections and arrays) and make all correspondent methods into the collection.
 * @chainable
 */
function addAllFeatures() {
  var METHODS = require('./methods');
  _.each(METHODS, function (method) {
    addFeature.call(this, method);
  }, this);
  return this;
}
/**
 * @class smart_collection.Collection
 * @cfg {String} [name] The optional name of the collection
 * @constructor
 */
function Collection(name) {
  this.fuse();
  if (_.isObject(name)) {
    name = name.name;
  }

  // properties
  this.readable('name', name);
  /**
   * @property {Array} items The entire collection of items.
   */
  this.readable('items', []);
  // add default view
  /**
   * @property {Array} all The default view with all items.
   */
  addView.call(this, 'all', function () {
    return this.items;
  });

  debug('ready');
}

fuse(Collection, EventEmitter);

var def = Collection.predefine;
var readable = def(Collection.prototype);

readable('add', add);
readable('addFirst', addFirst);
readable('addAt', addAt);
readable('remove', remove);
readable('removeFirst', removeFirst);
readable('removeLast', removeLast);
readable('removeAt', removeAt);
readable('removeRange', removeRange);
readable('flush', flush);
readable('addView', addView);
readable('addFeature', addFeature);
readable('addAllFeatures', addAllFeatures);

module.exports = Collection;

/**
 * @event add-before Fired before the add event.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The new item.
 * @param {Function} next The callback to cancel or resume an add operation.
 * @param {Function} next.cancel Call this to cancel the add operation.
 * @param {Function} next.resume Call this to resume the previous canceled add operation.
 */
/**
 * @event add Fired when a new item is added to the collection.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The new item.
 */
/**
 * @event add-after Fired after the add event.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The new item.
 */
/**
 * @event add-cancel Fired when an add event is canceled.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The skipped item.
 * @param {Object} resume The resume callback. Call this to resume the previous canceled add operation.
 */
/**
 * @event add-resume Fired when an add event is resumed after a cancel.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The resumed item.
 */
/**
 * @event remove-before Fired before the remove event.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The removed item.
 * @param {Function} next The callback to cancel or resume a remove operation.
 * @param {Function} next.cancel Call this to cancel the remove operation.
 * @param {Function} next.resume Call this to resume the previous canceled remove operation.
 */
/**
 * @event remove Fired when an item is removed from the collection.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The removed item.
 */
/**
 * @event remove-after Fired after the remove event.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The removed item.
 */
/**
 * @event remove-cancel Fired when a remove event is canceled.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The skipped item.
 * @param {Object} resume The resume callback. Call this to resume the previous canceled remove operation.
 */
/**
 * @event remove-resume Fired when a remove event is resumed after a cancel.
 * @param {Collection} sender The collection that fired the event.
 * @param {Object} item The resumed item.
 */
/**
 * @event empty Fired when the collection became empty.
 * @param {Collection} sender The collection that fired the event.
 */
/**
 * @event flush Fired when the collection is flushed and after the empty event.
 * @param {Collection} sender The collection that fired the event.
 */
