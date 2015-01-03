/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define(function(require, exports, module) {
    var Entity = require('./Entity');
    var EventHandler = require('./EventHandler');
    var Transform = require('./Transform');

    var usePrefix = !('transform' in document.documentElement.style);
    var devicePixelRatio = window.devicePixelRatio || 1;
    var invDevicePixelRatio = 1 / devicePixelRatio;

    /**
     * A base class for viewable content and event
     *   targets inside a Famo.us application, containing a renderable document
     *   fragment. Like an HTML div, it can accept internal markup,
     *   properties, classes, and handle events.
     *
     * @class ElementOutput
     * @constructor
     *
     * @param {Node} element document parent of this container
     */
    function ElementOutput(element) {
        this._transform = null;
        this._opacity = 1;
        this._origin = null;
        this._size = null;

        this._eventOutput = new EventHandler();
        this._eventOutput.bindThis(this);

        /** @ignore */
        this.eventForwarder = function eventForwarder(event) {
            this._eventOutput.emit(event.type, event);
        }.bind(this);

        this.id = Entity.register(this);
        this._currentTarget = null;

        this._opacityDirty = true;
        this._sizeDirty = true;
        this._originDirty = true;
        this._transformDirty = true;
        this._invisible = false;

        if (element) this.attach(element);
    }

    /**
     * Bind a callback function to an event type handled by this object.
     *
     * @method "on"
     *
     * @param {string} type event type key (for example, 'click')
     * @param {function(string, Object)} fn handler callback
     * @return {EventHandler} this
     */
    ElementOutput.prototype.on = function on(type, fn) {
        if (this._currentTarget) this._currentTarget.addEventListener(type, this.eventForwarder);
        this._eventOutput.on(type, fn);
    };

    /**
     * Unbind an event by type and handler.
     *   This undoes the work of "on"
     *
     * @method removeListener
     * @param {string} type event type key (for example, 'click')
     * @param {function(string, Object)} fn handler
     */
    ElementOutput.prototype.removeListener = function removeListener(type, fn) {
        this._eventOutput.removeListener(type, fn);
    };

    /**
     * Trigger an event, sending to all downstream handlers
     *   listening for provided 'type' key.
     *
     * @method emit
     *
     * @param {string} type event type key (for example, 'click')
     * @param {Object} [event] event data
     * @return {EventHandler} this
     */
    ElementOutput.prototype.emit = function emit(type, event) {
        if (event && !event.origin) event.origin = this;
        var handled = this._eventOutput.emit(type, event);
        if (handled && event && event.stopPropagation) event.stopPropagation();
        return handled;
    };

    /**
     * Add event handler object to set of downstream handlers.
     *
     * @method pipe
     *
     * @param {EventHandler} target event handler target object
     * @return {EventHandler} passed event handler
     */
    ElementOutput.prototype.pipe = function pipe(target) {
        return this._eventOutput.pipe(target);
    };

    /**
     * Remove handler object from set of downstream handlers.
     *   Undoes work of "pipe"
     *
     * @method unpipe
     *
     * @param {EventHandler} target target handler object
     * @return {EventHandler} provided target
     */
    ElementOutput.prototype.unpipe = function unpipe(target) {
        return this._eventOutput.unpipe(target);
    };

    /**
     * Return spec for this surface. Note that for a base surface, this is
     *    simply an id.
     *
     * @method render
     * @private
     * @return {Object} render spec for this surface (spec id)
     */
    ElementOutput.prototype.render = function render() {
        return this.id;
    };

    //  Attach Famous event handling to document events emanating from target
    //    document element.  This occurs just after attachment to the document.
    //    Calling this enables methods like #on and #pipe.
    function _addEventListeners(target) {
        for (var i in this._eventOutput.listeners) {
            target.addEventListener(i, this.eventForwarder);
        }
    }

    //  Detach Famous event handling from document events emanating from target
    //  document element.  This occurs just before detach from the document.
    function _removeEventListeners(target) {
        for (var i in this._eventOutput.listeners) {
            target.removeEventListener(i, this.eventForwarder);
        }
    }

    /**
     * Return a Matrix's webkit css representation to be used with the
     *    CSS3 -webkit-transform style.
     *    Example: -webkit-transform: matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,716,243,0,1)
     *
     * @method _formatCSSTransform
     * @private
     * @param {Transform} matrix transform
     * @return {string} matrix3d CSS style representation of the transform
     */
    function _formatCSSTransform(matrix) {
        matrix[12] = Math.round(matrix[12] * devicePixelRatio) * invDevicePixelRatio;
        matrix[13] = Math.round(matrix[13] * devicePixelRatio) * invDevicePixelRatio;

        var result = 'matrix3d(';
        for (var i = 0; i < 15; i++) result += matrix[i] + ',';

        return result + matrix[15] + ')';
    }

    /**
     * Directly apply given Transform to the document element as the
     *   appropriate webkit CSS style.
     *
     * @method setTransform
     *
     * @static
     * @private
     * @param {Element} element document element
     * @param {FamousMatrix} matrix
     */

    var _setTransform;
    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
        _setTransform = function(element, matrix) {
            element.style.zIndex = (matrix[14] * 1000000) | 0;    // fix for Firefox z-buffer issues
            element.style.transform = _formatCSSTransform(matrix);
        };
    }
    else if (usePrefix) {
        _setTransform = function(element, matrix) {
            element.style.webkitTransform = _formatCSSTransform(matrix);
        };
    }
    else {
        _setTransform = function(element, matrix) {
            element.style.transform = _formatCSSTransform(matrix);
        };
    }

    // format origin as CSS percentage string
    function _formatCSSOrigin(origin) {
        return (100 * origin[0]) + '% ' + (100 * origin[1]) + '%';
    }

    // Directly apply given origin coordinates to the document element as the
    // appropriate webkit CSS style.
    var _setOrigin = usePrefix ? function(element, origin) {
        element.style.webkitTransformOrigin = _formatCSSOrigin(origin);
    } : function(element, origin) {
        element.style.transformOrigin = _formatCSSOrigin(origin);
    };

    // Shrink given document element until it is effectively invisible.
    var _setInvisible = usePrefix ? function(element) {
        element.style.webkitTransform = 'scale3d(0.0001,0.0001,0.0001)';
        element.style.opacity = 0;
    } : function(element) {
        element.style.transform = 'scale3d(0.0001,0.0001,0.0001)';
        element.style.opacity = 0;
    };

    function _xyNotEquals(a, b) {
        return (a && b) ? (a[0] !== b[0] || a[1] !== b[1]) : a !== b;
    }

    /**
     * Apply changes from this component to the corresponding document element.
     * This includes changes to classes, styles, size, content, opacity, origin,
     * and matrix transforms.
     *
     * @private
     * @method commit
     * @param {Context} context commit context
     */
    ElementOutput.prototype.commit = function commit(context) {
        var target = this._currentTarget;
        if (!target || this._invisible) return;

        var transform = context.transform;
        var opacity = context.opacity;
        var origin = context.origin;
        var size = context.size;

        if (_xyNotEquals(this._origin, origin)) this._originDirty = true;
        if (Transform.notEquals(this._transform, transform)) this._transformDirty = true;
        if (this._opacity !== opacity) this._opacityDirty = true;

        if (this._opacityDirty) {
            this._opacityDirty = false;
            this._opacity = opacity;
            target.style.opacity = (opacity >= 1) ? '0.999999' : opacity;
        }

        if (this._transformDirty || this._originDirty || this._sizeDirty) {
            if (this._sizeDirty) this._sizeDirty = false;

            if (this._originDirty) {
                if (origin) {
                    if (!this._origin) this._origin = [0, 0];
                    this._origin[0] = origin[0];
                    this._origin[1] = origin[1];
                }
                else this._origin = null;
                _setOrigin(target, this._origin);
                this._originDirty = false;
            }

            if (!transform) transform = Transform.identity;
            this._transform = transform;
            var aaTransform = this._size ? Transform.thenMove(transform, [-this._size[0]*origin[0], -this._size[1]*origin[1], 0]) : transform;
            _setTransform(target, aaTransform);
            this._transformDirty = false;
        }
    };

    ElementOutput.prototype.cleanup = function cleanup() {
        if (this._currentTarget) this.setInvisible();
    };

    /**
     * Assigns the currentTarget for committing and binds event listeners.
     *
     * @private
     * @method attach
     * @param {Node} target document parent of this container
     */
    ElementOutput.prototype.attach = function attach(target) {
        this._invisible = false;
        this._currentTarget = target;
        _addEventListeners.call(this, target);
    };

    /**
     * Remove any contained document content associated with this surface
     *   from the actual document.
     *
     * @private
     * @method detach
     */
    ElementOutput.prototype.detach = function detach() {
        var target = this._currentTarget;
        if (target) {
            _removeEventListeners.call(this, target);
            this.setInvisible();
        }
        this._currentTarget = null;
    };

    ElementOutput.prototype.setInvisible = function(){
        this._invisible = true;
        this._transform = null;
        this._opacity = 0;
        var target = this._currentTarget;
        if (target){
            target.style.display = '';
            _setInvisible(target);
        }
    }

    module.exports = ElementOutput;
});
