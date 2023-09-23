/*! Snowflakes | © 2019 Denis Seleznev | MIT License | https://github.com/hcodes/snowflakes/ */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Snowflakes = factory());
}(this, function () { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArrayLimit(arr, i) {
    if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var animationPrefix = '';

  if (typeof window !== 'undefined') {
    animationPrefix = Array.prototype.slice.call(window.getComputedStyle(document.documentElement, '')).join(',').search(/,animation/) > -1 ? '' : 'Webkit';
  }
  /**
   * Set inline style.
   *
   * @param {DOMElement} dom
   * @param {Object} props
   */


  function setStyle(dom, props) {
    Object.keys(props).forEach(function (originalKey) {
      var key = originalKey;

      if (animationPrefix && originalKey.search('animation') > -1) {
        key = animationPrefix + originalKey[0].toUpperCase() + originalKey.substr(1);
      }

      dom.style[key] = props[originalKey];
    });
  }
  /**
   * Show DOM element.
   *
   * @param {DOMElement} dom
   */

  function showElement(dom) {
    setStyle(dom, {
      display: 'block'
    });
  }
  /**
   * Hide DOM element.
   *
   * @param {DOMElement} dom
   */

  function hideElement(dom) {
    setStyle(dom, {
      display: 'none'
    });
  }
  /**
   * Get window height.
   *
   * @returns {number}
   */

  function getWindowHeight() {
    var body = document.body,
        docElement = document.documentElement;
    var height;

    if (window.innerHeight) {
      height = window.innerHeight;
    } else if (docElement && docElement.clientHeight) {
      height = docElement.clientHeight;
    } else if (body) {
      height = body.clientHeight;
    }

    return height;
  }
  /**
   * Get window height.
   *
   * @param {string} style
   * @param {DOMNode} styleNode
   *
   * @returns {DOMNode}
   */

  function injectStyle(style, styleNode) {
    if (!styleNode) {
      styleNode = document.createElement('style');
      document.body.appendChild(styleNode);
    }

    if (styleNode.styleSheet) {
      // IE
      styleNode.styleSheet.cssText = style;
    } else if ('textContent' in styleNode) {
      styleNode.textContent = style;
    } else {
      styleNode.innerHTML = style;
    }

    return styleNode;
  }
  /**
   * Remove DOM node.
   *
   * @param {DOMNode} node
   *
   */

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
  /**
   * A DOM node is body.
   *
   * @param {DOMNode} node
   *
   * @returns {boolean}
   */

  function isBody(node) {
    return node === document.body;
  }
  /**
   * Add classname for a node.
   *
   * @param {DOMNode} node
   * @param {string} classname
   */

  function addClass(node, classname) {
    node.classList.add(classname);
  }
  /**
   * Remove classname for a node.
   *
   * @param {DOMNode} node
   * @param {string} classname
   */

  function removeClass(node, classname) {
    node.classList.remove(classname);
  }

  /**
   * Get random number.
   *
   * @param {number} from
   * @param {number} max
   *
   * @returns {number}
   */
  function getRandom(from, max) {
    return from + Math.floor(Math.random() * (max - from));
  }
  /**
   * Linear interpolation.
   *
   * @param {number} x
   * @param {number} x1
   * @param {number} x2
   * @param {number} y1
   * @param {number} y2
   *
   * @returns {number}
   */

  function interpolation(x, x1, x2, y1, y2) {
    return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
  }

  var Flake = /*#__PURE__*/function () {
    /**
     * @constructor
     *
     * @param {DOMElement} container
     * @param {number} containerHeight
     * @param {Object} params
     * @param {number} [params.count]
     * @param {number} [params.speed]
     * @param {boolean} [params.rotation]
     * @param {number} [params.minOpacity]
     * @param {number} [params.maxOpacity]
     * @param {number} [params.minSize]
     * @param {number} [params.maxSize]
     * @param {number} [params.types]
     * @param {number} [params.wind]
     * @param {number} [params.zIndex]
     */
    function Flake(container, containerHeight, params) {
      _classCallCheck(this, Flake);

      var isEqual = params.minSize === params.maxSize;
      this.innerSize = isEqual ? 0 : getRandom(0, Flake.maxInnerSize);
      this.size = Flake.calcSize(this.innerSize, params);
      var flake = document.createElement('div'),
          innerFlake = document.createElement('div'),
          animationProps = this.getAnimationProps(containerHeight, params),
          styleProps = {
        animationDelay: animationProps.animationDelay,
        animationDuration: animationProps.animationDuration,
        left: Math.random() * 99 + '%',
        marginTop: -Math.sqrt(2) * this.size + 'px',
        width: this.size + 'px',
        height: this.size + 'px'
      };

      if (!isEqual) {
        styleProps.zIndex = params.zIndex + this.size * 10;
        styleProps.opacity = interpolation(this.size, params.minSize, params.maxSize, params.minOpacity, params.maxOpacity);
      }

      setStyle(flake, styleProps);
      setStyle(innerFlake, {
        animationName: 'snowflake_x_' + this.innerSize,
        animationDelay: Math.random() + 's'
      });
      addClass(flake, 'snowflake');
      addClass(innerFlake, 'snowflake__inner');

      if (params.types) {
        addClass(innerFlake, 'snowflake__inner_type_' + getRandom(0, params.types));
      }

      if (params.wind) {
        addClass(innerFlake, 'snowflake__inner_wind');
      }

      if (params.rotation) {
        addClass(innerFlake, 'snowflake__inner_rotation' + (Math.random() > 0.5 ? '' : '_reverse'));
      }

      flake.appendChild(innerFlake);
      this._elem = flake;
      container.appendChild(flake);
    }
    /**
     * Calc size.
     *
     * @param {number} innerSize
     * @param {Object} params
     *
     * @returns {number}
     */


    _createClass(Flake, [{
      key: "getAnimationProps",

      /**
       * Get animation properties.
       *
       * @param {number} containerHeight
       * @param {Object} params
       *
       * @returns {Object}
       */
      value: function getAnimationProps(containerHeight, params) {
        var speedMax = containerHeight / 50 / params.speed,
            speedMin = speedMax / 3;
        return {
          animationDelay: Math.random() * speedMax + 's',
          animationDuration: interpolation(this.size, params.minSize, params.maxSize, speedMax, speedMin) + 's'
        };
      }
      /**
       * Resize a flake.
       *
       * @param {number} containerHeight
       * @param {Object} params
       */

    }, {
      key: "resize",
      value: function resize(containerHeight, params) {
        var props = this.getAnimationProps(containerHeight, params);
        setStyle(this._elem, props);
      }
      /**
       * Destroy a flake.
       */

    }, {
      key: "destroy",
      value: function destroy() {
        delete this._elem;
      }
    }], [{
      key: "calcSize",
      value: function calcSize(innerSize, params) {
        return Math.floor(interpolation(innerSize, 0, Flake.maxInnerSize, params.minSize, params.maxSize));
      }
    }]);

    return Flake;
  }();

  _defineProperty(Flake, "maxInnerSize", 20);

  var mainStyle = '.snowflake{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none;-webkit-animation:snowflake_y 10s linear infinite;animation:snowflake_y 10s linear infinite;will-change:transform}.snowflake__inner,.snowflake__inner:before{position:absolute;top:0;right:0;bottom:0;left:0}.snowflake__inner:before{content:"";background-size:100% 100%}.snowflake__inner_wind{-webkit-animation:snowflake_x_8 1s ease-in-out infinite alternate;animation:snowflake_x_8 1s ease-in-out infinite alternate}.snowflake__inner_rotation:before{-webkit-animation:snowflake_rotation 2s linear infinite;animation:snowflake_rotation 2s linear infinite}.snowflake__inner_rotation_reverse:before{-webkit-animation:snowflake_rotation_reverse 2s linear infinite;animation:snowflake_rotation_reverse 2s linear infinite}.snowflakes{pointer-events:none}.snowflakes_paused .snowflake,.snowflakes_paused .snowflake__inner,.snowflakes_paused .snowflake__inner:before{-webkit-animation-play-state:paused;animation-play-state:paused}.snowflakes_body{position:fixed;top:0;left:0;width:100%;height:1px}@-webkit-keyframes snowflake_rotation{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}@keyframes snowflake_rotation{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}@-webkit-keyframes snowflake_rotation_reverse{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(-1turn);transform:rotate(-1turn)}}@keyframes snowflake_rotation_reverse{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(-1turn);transform:rotate(-1turn)}}',
      imagesStyle = '.snowflake__inner_type_0:before{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'36.283\' height=\'36.283\'%3E%3Cpath d=\'M35.531 17.391h-3.09l.845-1.464a.748.748 0 10-1.297-.75l-1.276 2.214H28.61l2.515-4.354a.751.751 0 00-.272-1.024.75.75 0 00-1.024.274l-2.948 5.104h-2.023a6.751 6.751 0 00-2.713-4.684l1.019-1.76 5.896-.002a.75.75 0 000-1.5l-5.029.002 1.051-1.82 2.557.002a.75.75 0 000-1.5l-1.689-.002 1.545-2.676a.75.75 0 10-1.302-.75l-1.547 2.676-.844-1.463a.749.749 0 10-1.297.75l1.278 2.213-1.051 1.818-2.514-4.354a.75.75 0 00-1.298.75l2.946 5.104-1.016 1.758a6.692 6.692 0 00-2.706-.57 6.74 6.74 0 00-2.707.568l-1.013-1.754 2.946-5.105a.75.75 0 00-1.298-.75L13.56 8.697l-1.05-1.818 1.278-2.217a.749.749 0 00-1.298-.75l-.845 1.465-1.551-2.678a.75.75 0 00-1.024-.273.748.748 0 00-.274 1.023l1.545 2.678H8.652a.75.75 0 000 1.5h2.556l1.05 1.818H7.231a.75.75 0 000 1.5h5.894l1.017 1.762a6.755 6.755 0 00-2.712 4.684H9.406l-2.95-5.104a.75.75 0 10-1.299.75l2.516 4.354H5.569l-1.277-2.213a.75.75 0 00-1.298.75l.845 1.463H.75a.75.75 0 000 1.5h3.09l-.845 1.465a.747.747 0 00.275 1.022.75.75 0 00.374.103.75.75 0 00.65-.375l1.277-2.215h2.103l-2.516 4.354a.75.75 0 001.299.75l2.949-5.104h2.024a6.761 6.761 0 002.712 4.685l-1.017 1.762H7.232a.75.75 0 000 1.5h5.026l-1.05 1.818H8.651a.75.75 0 000 1.5h1.69l-1.545 2.676a.75.75 0 001.299.75l1.546-2.676.846 1.465a.755.755 0 00.65.375.737.737 0 00.375-.103.747.747 0 00.274-1.022l-1.279-2.215 1.05-1.82 2.515 4.354a.75.75 0 001.299-.75l-2.947-5.104 1.013-1.756a6.72 6.72 0 005.415 0l1.014 1.756-2.947 5.104a.75.75 0 001.298.75l2.515-4.354 1.053 1.82-1.277 2.213a.75.75 0 001.298.75l.844-1.463 1.545 2.678c.141.24.393.375.65.375a.75.75 0 00.649-1.125l-1.548-2.678h1.689a.75.75 0 000-1.5h-2.557l-1.051-1.82 5.029.002a.75.75 0 000-1.5l-5.896-.002-1.019-1.76a6.75 6.75 0 002.711-4.685h2.023l2.947 5.104a.753.753 0 001.025.273.749.749 0 00.272-1.023l-2.515-4.354h2.104l1.279 2.215a.75.75 0 00.649.375c.127 0 .256-.03.375-.103a.748.748 0 00.273-1.022l-.848-1.465h3.092a.75.75 0 00.003-1.5zm-12.136.75c0 .257-.041.502-.076.75a5.223 5.223 0 01-1.943 3.358 5.242 5.242 0 01-1.291.766 5.224 5.224 0 01-1.949.384 5.157 5.157 0 01-3.239-1.15 5.22 5.22 0 01-1.943-3.358c-.036-.247-.076-.493-.076-.75s.04-.503.076-.75a5.22 5.22 0 011.944-3.359c.393-.312.82-.576 1.291-.765a5.219 5.219 0 011.948-.384c.69 0 1.344.142 1.948.384.471.188.898.454 1.291.765a5.222 5.222 0 011.943 3.359c.035.247.076.493.076.75z\' fill=\'{color}\'/%3E%3C/svg%3E")}.snowflake__inner_type_1:before{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32.813\' height=\'32.813\'%3E%3Cpath d=\'M29.106 24.424a.781.781 0 01-.781.781h-3.119v3.119a.782.782 0 01-1.562 0v-4.682h4.682c.43.001.78.351.78.782zM4.673 9.352h4.682V4.671a.781.781 0 00-1.563 0V7.79H4.673a.781.781 0 000 1.562zM3.708 24.24c0 .431.35.781.781.781H7.61v3.12a.78.78 0 101.562 0v-4.683H4.489a.782.782 0 00-.781.782zM28.923 8.39a.78.78 0 00-.781-.781h-3.121V4.488a.781.781 0 00-1.562 0v4.684h4.684a.783.783 0 00.78-.782zm3.889 8.017c0 .431-.35.781-.781.781h-3.426l1.876 1.873a.784.784 0 010 1.107.791.791 0 01-.554.228.773.773 0 01-.55-.228l-2.979-2.98h-2.995a6.995 6.995 0 01-1.728 3.875h5.609a.781.781 0 010 1.562h-4.666v4.667a.782.782 0 01-1.562 0v-5.61a7 7 0 01-3.866 1.719v2.995l2.978 2.98c.306.305.306.8 0 1.104a.78.78 0 01-1.104 0l-1.874-1.876v3.427a.781.781 0 01-1.562 0v-3.427l-1.875 1.876a.78.78 0 11-1.105-1.104l2.979-2.98v-2.995a7.016 7.016 0 01-3.865-1.717v5.608a.781.781 0 01-1.562 0v-4.667H5.535a.781.781 0 010-1.562h5.607a7.022 7.022 0 01-1.728-3.875H6.417l-2.979 2.979a.784.784 0 01-1.104 0 .781.781 0 010-1.106l1.874-1.873H.782a.78.78 0 11-.001-1.563h3.426L2.333 13.75a.783.783 0 011.105-1.106l2.979 2.979h2.995a6.996 6.996 0 011.72-3.866H5.533a.781.781 0 010-1.562h4.666V5.528a.781.781 0 011.562 0v5.599a6.995 6.995 0 013.865-1.717V6.415l-2.978-2.979a.782.782 0 011.105-1.105l1.874 1.875V.781a.78.78 0 111.562 0v3.426l1.875-1.875a.777.777 0 011.104 0 .78.78 0 010 1.105l-2.978 2.98v2.996a7.021 7.021 0 013.866 1.718V5.532a.78.78 0 111.562 0v4.666h4.666a.78.78 0 110 1.562h-5.599a7 7 0 011.718 3.866h2.995l2.979-2.979a.783.783 0 011.106 1.106l-1.876 1.874h3.427a.777.777 0 01.778.78zm-11.006-.782a5.457 5.457 0 00-4.618-4.617c-.257-.037-.514-.079-.781-.079-.268 0-.524.042-.781.079a5.458 5.458 0 00-4.618 4.617c-.038.257-.079.514-.079.781s.041.522.079.781a5.455 5.455 0 004.618 4.616c.257.036.514.079.781.079s.524-.043.781-.079a5.457 5.457 0 004.618-4.616c.037-.259.079-.515.079-.781s-.043-.524-.079-.781z\' fill=\'{color}\'/%3E%3C/svg%3E")}.snowflake__inner_type_2:before{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'35.79\' height=\'35.79\'%3E%3Cpath d=\'M7.161 22.223l.026-.047.865.5-.026.047a.503.503 0 01-.434.25c-.019 0-.034-.013-.053-.016l-.355-.205a.493.493 0 01-.023-.529zM9.969 8.988l2.785.001 1.393-2.414a.502.502 0 00-.869-.499l-1.103 1.913-2.208-.001a.5.5 0 10.002 1zm15.854 17.813h-2.785l-1.393 2.411a.499.499 0 00.436.75c.172 0 .34-.09.434-.25l1.104-1.911h2.207c.274 0 .5-.224.5-.5a.505.505 0 00-.503-.5zM23.038 8.99h2.785a.5.5 0 000-1h-2.207l-1.105-1.913a.5.5 0 00-.868.5l1.395 2.413zM12.754 26.801H9.967a.5.5 0 000 1h2.209l1.105 1.912a.496.496 0 00.682.184.5.5 0 00.184-.684l-1.393-2.412zm-7.218-6.309a.502.502 0 00.685-.184l1.391-2.413-1.394-2.413a.5.5 0 00-.867.5l1.104 1.913-1.104 1.913a.5.5 0 00.185.684zM30.254 15.3a.505.505 0 00-.685.183l-1.392 2.412 1.395 2.414a.501.501 0 00.867-.5l-1.104-1.914 1.104-1.912a.5.5 0 00-.185-.683zm3.138 11.542a.501.501 0 01-.683.184l-.98-.565-2.137 1.231a.516.516 0 01-.5 0l-2.385-1.377a.502.502 0 01-.25-.433v-.854h-4.441l-2.225 3.852.736.428c.154.088.25.254.25.432l.001 2.755a.5.5 0 01-.25.433l-2.133 1.229v1.136c0 .274-.225.5-.5.5s-.5-.226-.5-.5v-1.136l-2.136-1.23a.5.5 0 01-.25-.433l.001-2.755c0-.178.096-.344.25-.432l.738-.427-2.224-3.849H9.332l.002.851a.505.505 0 01-.25.435l-2.387 1.377a.5.5 0 01-.5 0L4.06 26.46l-.982.567a.5.5 0 01-.5-.867l.982-.567.001-2.465c0-.179.097-.344.25-.434l2.388-1.377a.497.497 0 01.5 0l.736.426 2.221-3.848-2.222-3.849-.737.426a.51.51 0 01-.5 0l-2.386-1.377a.5.5 0 01-.25-.434l.002-2.464-.983-.567a.501.501 0 01-.184-.683.502.502 0 01.684-.183l.983.568 2.134-1.233a.5.5 0 01.5 0l2.385 1.379c.156.089.25.255.25.433v.85h4.443l2.223-3.846-.74-.427a.501.501 0 01-.25-.434l.002-2.755c0-.178.096-.343.25-.433l2.135-1.233V.5a.5.5 0 011 0v1.135l2.134 1.231c.154.089.25.254.25.434l-.002 2.755a.503.503 0 01-.25.433l-.733.425 2.224 3.849h4.44l-.002-.851c0-.179.096-.344.25-.434l2.388-1.378a.502.502 0 01.5 0l2.136 1.233.982-.568a.5.5 0 11.5.866l-.983.568v2.464a.503.503 0 01-.25.433l-2.388 1.378a.5.5 0 01-.5 0l-.735-.426-2.222 3.849 2.223 3.849.734-.425a.506.506 0 01.5 0l2.389 1.375c.154.09.25.255.25.435l-.002 2.462.982.568c.24.137.321.444.182.682zm-2.165-1.828l.001-1.597-1.888-1.087-.734.424-.348.201-.301.173-.5.289v2.179l1.885 1.088 1.386-.802.498-.286.001-.582zm-3.736-11.467l-.531-.307-2.283 1.318-2.443 3.337 2.442 3.337 2.283 1.316.531-.306-2.514-4.348 2.515-4.347zm-7.712 16.478l-.762-.438-.339-.194-.283-.166-.5-.289-.5.289-.279.162-.349.2-.757.437-.001 2.177 1.386.797.501.289.499-.287 1.386-.798-.002-2.179zM16.008 5.767l.736.425.371.214.279.16.5.288.5-.289.281-.163.367-.212.732-.424.002-2.178-1.381-.797-.502-.289-.498.287-1.385.8-.002 2.178zm6.52 14.227l-1.535-2.099 1.535-2.098.732-1-1.232.134-2.585.281-1.048-2.379-.5-1.133-.5 1.134-1.049 2.379-2.585-.281-1.232-.134.732 1 1.536 2.097-1.536 2.098-.732 1 1.232-.134 2.585-.281 1.049 2.379.5 1.134.5-1.134 1.048-2.379 2.585.281 1.232.134-.732-.999zm8.2-10.084l-1.386-.8-1.887 1.089v1.279l.002.32v.577l.5.289.28.163.367.213.732.424 1.888-1.089v-2.178l-.496-.287zM18.927 7.413l-.532.307v2.637l1.667 3.784 4.111-.447 2.283-1.317-.002-.613h-5.02l-2.507-4.351zm-9.594 4.348v.614l2.283 1.318 4.111.447 1.668-3.785V7.719l-.531-.306-2.509 4.347-5.022.001zm-2.15 1.279l.37-.213.279-.162.5-.289V10.2L6.446 9.11l-1.384.8-.499.289v.578l-.002 1.599 1.885 1.088.737-.424zm1.119 9.205l.53.306 2.281-1.316 2.443-3.339-2.442-3.337-2.281-1.317-.531.307 2.511 4.348-2.511 4.348zm-1.115-.069l-.026.047a.493.493 0 00.023.529l-.734-.424-1.887 1.089-.001 1.599v.578l.5.288 1.386.8 1.887-1.088v-1.278l-.002-.321v-.577l-.5-.289-.293-.169c.02.002.035.017.055.017a.5.5 0 00.433-.25l.026-.047-.867-.504zm9.679 6.202l.529-.306v-2.637l-1.668-3.785-4.111.447-2.283 1.316.002.611 5.021.002 2.51 4.352zm9.591-4.349v-.612L24.174 22.1l-4.111-.447-1.667 3.783v2.639l.531.307 2.512-4.352h5.018v-.001z\' fill=\'{color}\'/%3E%3C/svg%3E")}.snowflake__inner_type_3:before{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32.815\' height=\'32.815\'%3E%3Cpath d=\'M4.581 23.55h4.681v4.681a.78.78 0 11-1.562 0v-3.118H4.581a.781.781 0 010-1.563zM29.016 8.481a.781.781 0 00-.781-.781h-3.119V4.582a.781.781 0 00-1.562 0v4.681h4.682c.429 0 .78-.35.78-.782zm-24.252.598l4.683-.001V4.395a.781.781 0 00-1.562 0v3.121l-3.121.001a.781.781 0 000 1.562zm23.655 14.287h-4.685l.002 4.684a.78.78 0 101.562 0l-.002-3.121h3.122a.781.781 0 00.001-1.563zm4.394-6.96a.78.78 0 01-.781.781h-3.426l1.876 1.875a.782.782 0 01-1.104 1.105l-2.979-2.979h-1.986L17.19 24.41v1.987l2.977 2.979a.781.781 0 01-1.103 1.106l-1.874-1.875v3.426a.78.78 0 11-1.562 0v-3.426l-1.875 1.875a.782.782 0 01-1.105-1.105l2.978-2.979V24.41l-7.219-7.22H6.418l-2.98 2.98a.777.777 0 01-1.103 0 .781.781 0 010-1.106L4.21 17.19H.783a.78.78 0 110-1.562h3.426l-1.876-1.875a.782.782 0 111.106-1.105l2.979 2.979h1.989l7.219-7.218v-1.99L12.648 3.44a.782.782 0 111.106-1.105l1.874 1.874V.781a.782.782 0 011.563 0v3.426l1.875-1.875a.783.783 0 011.106 1.105l-2.979 2.979v1.99l7.216 7.218h1.992l2.979-2.979a.782.782 0 011.105 1.105l-1.876 1.874h3.427a.781.781 0 01.777.782zm-10.613.782l.778-.78-.781-.782-5.009-5.008-.781-.781-.781.781-5.01 5.008-.781.781.781.781 5.01 5.011.782.781.78-.779 5.012-5.013zm5.863 4.646a.782.782 0 00-.781-.781h-6.229v6.228a.78.78 0 101.562 0v-4.665h4.666a.782.782 0 00.782-.782zm-.001-10.855a.782.782 0 00-.781-.781h-4.664V5.532a.782.782 0 00-1.562 0v6.228h6.227a.78.78 0 00.78-.781zm-23.318 0c0 .432.35.781.781.781h6.228V5.532a.781.781 0 00-1.562 0v4.666H5.525a.781.781 0 00-.781.781zm.002 10.855c0 .432.35.781.781.781h4.664v4.665a.78.78 0 101.562 0v-6.228H5.527a.783.783 0 00-.781.782z\' fill=\'{color}\'/%3E%3C/svg%3E")}.snowflake__inner_type_4:before{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'37.794\' height=\'37.794\'%3E%3Cpath d=\'M30.638 17.313l-.914 1.584.915 1.585a.78.78 0 11-1.352.78l-1.366-2.366 1.366-2.365a.782.782 0 011.067-.286c.372.215.5.692.284 1.068zM11.65 11.08l2.733.002 1.367-2.367a.78.78 0 00-1.352-.781l-.915 1.585-1.831-.002h-.001a.78.78 0 00-.001 1.563zm14.491 15.633h-2.733l-1.365 2.365a.78.78 0 101.352.78l.914-1.584h1.831a.781.781 0 00.001-1.561zm-4.1-17.998l1.367 2.367h2.733a.78.78 0 100-1.562h-1.833l-.915-1.585a.78.78 0 00-1.352.78zM15.75 29.08l-1.368-2.366h-2.733a.781.781 0 000 1.562h1.832l.917 1.585c.146.25.409.391.677.391a.779.779 0 00.675-1.172zm-8.313-7.531a.78.78 0 001.067-.284L9.87 18.9l-1.367-2.368a.781.781 0 00-1.351.781l.916 1.587-.914 1.584a.776.776 0 00.283 1.065zm27.827 6.798a.784.784 0 01-1.067.285l-.89-.515-2.096 1.209a.793.793 0 01-.391.105.762.762 0 01-.391-.105l-2.484-1.435a.78.78 0 01-.391-.676l-.002-2.417-2.408-1.392a7.714 7.714 0 01-5.467 3.168v2.773l2.093 1.208a.78.78 0 01.391.676l.001 2.868c0 .28-.149.537-.392.676l-2.093 1.205v1.032a.781.781 0 01-1.562 0V35.98l-2.095-1.207a.78.78 0 01-.391-.676l.001-2.868c0-.28.15-.537.391-.676l2.094-1.206v-2.773a7.718 7.718 0 01-5.468-3.168l-2.408 1.392.002 2.415c0 .281-.15.539-.391.676l-2.487 1.437a.785.785 0 01-.782 0l-2.095-1.209-.893.518a.782.782 0 01-.782-1.354l.893-.517.001-2.414a.78.78 0 01.391-.677l2.487-1.434a.774.774 0 01.781 0l2.093 1.208 2.407-1.39a7.655 7.655 0 010-6.317l-2.406-1.39-2.096 1.209a.772.772 0 01-.782 0l-2.485-1.434a.786.786 0 01-.391-.676l.002-2.416-.894-.517a.78.78 0 01-.285-1.066.788.788 0 011.07-.283l.893.514 2.093-1.208a.774.774 0 01.781 0L9.851 9.91c.24.14.391.398.391.675L10.24 13l2.408 1.392a7.712 7.712 0 015.468-3.167V8.45L16.02 7.242a.78.78 0 01-.391-.676l.002-2.87c0-.279.15-.538.391-.675l2.094-1.208V.781a.781.781 0 011.562 0v1.032l2.093 1.206a.785.785 0 01.391.677l-.002 2.87c0 .28-.149.536-.391.674l-2.091 1.208v2.772a7.708 7.708 0 015.467 3.167l2.409-1.392-.002-2.416c0-.28.149-.539.391-.676l2.487-1.436c.24-.14.539-.14.781 0l2.095 1.208.894-.514a.78.78 0 11.781 1.352l-.894.516v2.417c0 .279-.15.538-.391.675l-2.487 1.436a.785.785 0 01-.782 0l-2.092-1.209-2.408 1.39c.436.967.684 2.032.684 3.158a7.65 7.65 0 01-.684 3.158l2.408 1.391 2.091-1.206a.782.782 0 01.78 0l2.488 1.432c.24.141.392.398.392.677l-.002 2.414.893.517a.783.783 0 01.287 1.068zm-6.147-16.251l.001.9.78.453.921.531 1.706-.982v-1.965l-.78-.451-.923-.533-1.707.983.002 1.064zm-20.443-.002l.002-1.063-1.706-.985-.922.535-.778.451-.001.902-.001 1.063 1.703.982.924-.533.779-.451v-.901zm0 13.604l-.001-.899-.781-.451-.919-.533-1.706.982-.001 1.064v.901l.781.451.923.533 1.707-.982-.003-1.066zm15.109-3.076c.315-.413.586-.864.789-1.351a6.121 6.121 0 000-4.748 6.175 6.175 0 00-.789-1.35 6.158 6.158 0 00-4.106-2.375 6.48 6.48 0 00-.781-.056c-.266 0-.525.022-.781.056a6.149 6.149 0 00-4.106 2.375 6.128 6.128 0 00-.789 1.35 6.104 6.104 0 00-.479 2.374 6.1 6.1 0 001.268 3.725 6.15 6.15 0 004.106 2.374c.256.031.516.056.781.056s.525-.022.781-.056a6.142 6.142 0 004.106-2.374zM17.19 6.113l.924.531.781.452.781-.452.919-.531.002-1.968-.921-.531-.784-.452-.779.451-.922.532-.001 1.968zm3.408 25.57l-.921-.532-.781-.452-.781.452-.922.532-.001 1.966.923.531.782.451.78-.449.922-.533-.001-1.966zm11.925-5.819l.001-1.063-1.707-.981-.919.529-.782.451v.901l.001 1.065 1.702.981.924-.533.778-.449.002-.901z\' fill=\'{color}\'/%3E%3C/svg%3E")}.snowflake__inner_type_5:before{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'31.25\' height=\'31.25\'%3E%3Cpath d=\'M20.581 1.176l-3.914 3.915V0h1.041v2.576L19.845.439l.736.737zm-1.615 9.069l.351.217 6.623-6.625-.736-.737-6.048 6.051a7.141 7.141 0 00-1.449-.6v-.082l5.082-5.082-.737-.737-5.387 5.388v1.33l.402.093a6.213 6.213 0 011.899.784zm2.041 2.043c.368.585.63 1.224.786 1.893l.094.403h1.028l5.171-5.173-.736-.737-4.699 4.701a7.523 7.523 0 00-.549-1.28l6.048-6.05-.737-.735-6.622 6.625.216.353zm7.368 1.254l1.921-1.923-.736-.735-3.699 3.7h5.39v-1.042h-2.876zm1.185 6.826l.736-.736-1.923-1.923h2.877v-1.042h-5.389l3.699 3.701zm-6.915-2.498l4.705 4.707.736-.736-5.171-5.174h-1.03l-.096.4a6.24 6.24 0 01-.795 1.883l-.22.353 6.639 6.641.736-.736-6.061-6.062c.227-.414.414-.84.557-1.276zm-3.7 3.125a6.241 6.241 0 01-1.88.794l-.399.096v1.33l5.387 5.387.736-.736-5.082-5.082v-.089a7.322 7.322 0 001.434-.605l6.061 6.062.736-.736-6.641-6.641-.352.22zM16.667 31.25h1.041v-2.576l2.137 2.137.736-.737-3.914-3.914v5.09zm-5.26-.439l2.134-2.137v2.576h1.042v-5.093l-3.913 3.916.737.738zm.897-9.816l-.352-.222-6.642 6.641.736.736 6.062-6.062c.456.254.937.456 1.433.605v.089l-5.08 5.082.736.736 5.387-5.387v-1.33l-.4-.096a6.175 6.175 0 01-1.88-.792zm-2.046-2.047a6.315 6.315 0 01-.798-1.883l-.096-.4H8.335l-5.172 5.174.737.736 4.706-4.71c.145.441.329.865.556 1.276L3.1 25.202l.736.736 6.643-6.643-.221-.347zM0 16.667v1.042h2.876L.954 19.632l.736.736 3.698-3.701H0zm1.69-5.783l-.736.735 1.921 1.923H0v1.042h5.39l-3.7-3.7zm6.916 2.498L3.9 8.674l-.736.737 5.172 5.173h1.029l.096-.4a6.15 6.15 0 01.798-1.881l.222-.352L3.837 5.31l-.736.736 6.062 6.06a7.268 7.268 0 00-.557 1.276zm-.145-9.996l5.08 5.082v.088c-.497.15-.977.352-1.433.606L6.047 3.101l-.736.737 6.643 6.643.352-.222a6.223 6.223 0 011.88-.797l.4-.095v-1.33L9.2 2.649l-.739.737zm5.081-.81L11.408.439l-.736.737 3.913 3.917V0h-1.042v2.576zm-1.757 14.831a4.2 4.2 0 002.06 2.058l.739.338v-3.136h-3.138l.339.74zm0-3.562l-.337.738h3.135v-3.136l-.739.338a4.223 4.223 0 00-2.059 2.06zm7.679 3.561l.338-.739h-3.135v3.136l.738-.338a4.204 4.204 0 002.059-2.059zm0-3.561a4.198 4.198 0 00-2.059-2.06l-.738-.34v3.138h3.135l-.338-.738z\' fill=\'{color}\'/%3E%3C/svg%3E")}';

  var Snowflakes = /*#__PURE__*/function () {
    /**
     * @constructor
     *
     * @param {Object} params
     *
     * @param {DOMElem} [params.container=document.body]
     * @param {number} [params.count=50]
     * @param {number} [params.color="#5ECDEF"]
     * @param {number} [params.minOpacity=0.6]
     * @param {number} [params.maxOpacity=1]
     * @param {number} [params.minSize=8]
     * @param {number} [params.maxSize=18]
     * @param {boolean} [params.rotation=true]
     * @param {number} [params.speed=1]
     * @param {boolean} [params.stop=false]
     * @param {number} [params.types=6]
     * @param {number} [params.width=width of container]
     * @param {number} [params.height=height of container]
     * @param {boolean} [params.wind=true]
     * @param {number} [params.zIndex=9999]
     */
    function Snowflakes(params) {
      var _this = this;

      _classCallCheck(this, Snowflakes);

      this.params = this._setParams(params);
      this._flakes = [];
      this._isBody = isBody(this.params.container);
      var container = this._container = document.createElement('div');
      addClass(container, 'snowflakes');
      this._isBody && addClass(container, 'snowflakes_body');
      setStyle(container, {
        zIndex: this.params.zIndex
      });
      this.params.container.appendChild(container);

      if (this.params.stop) {
        this.stop();
      }

      if (!Snowflakes._mainStyleNode) {
        Snowflakes._mainStyleNode = injectStyle(mainStyle);
        Snowflakes._count = (Snowflakes._count || 0) + 1;
      }

      this._winHeight = getWindowHeight();

      this._onResize = function () {
        _this._winHeight = getWindowHeight();

        var height = _this._height();

        hideElement(container);

        _this._flakes.forEach(function (flake) {
          return flake.resize(height, _this.params);
        });

        _this._updateAnimationStyle();

        showElement(container);
      };

      {
        this._imagesStyleNode = injectStyle(imagesStyle.replace(/\{color\}/g, encodeURIComponent(this.params.color)));
      }

      this._animationStyleNode = injectStyle(this._getAnimationStyle());
      window.addEventListener('resize', this._onResize, false);

      for (var i = 0; i < this.params.count; i++) {
        this._flakes.push(new Flake(container, this._height(), this.params));
      }
    }
    /**
     * Destroy flakes.
     */


    _createClass(Snowflakes, [{
      key: "destroy",
      value: function destroy() {
        this._removeStyle();

        removeNode(this._container);
        delete this._container;
        window.removeEventListener('resize', this._onResize, false);

        this._flakes.forEach(function (flake) {
          return flake.destroy();
        });

        delete this._flakes;
        delete this.params;
      }
      /**
       * Start CSS animation.
       */

    }, {
      key: "start",
      value: function start() {
        removeClass(this._container, 'snowflakes_paused');
      }
      /**
       * Stop CSS animation.
       */

    }, {
      key: "stop",
      value: function stop() {
        addClass(this._container, 'snowflakes_paused');
      }
    }, {
      key: "_setParams",
      value: function _setParams(params) {
        params = params || {};
        var result = {};
        [['color', '#5ECDEF'], ['container', document.body], ['count', 50], ['speed', 1], ['stop', false], ['rotation', true], ['minOpacity', 0.6], ['maxOpacity', 1], ['minSize', 8], ['maxSize', 18], ['types', 6], ['width'], ['height'], ['wind', true], ['zIndex', 9999]].forEach(function (item) {
          var _item = _slicedToArray(item, 2),
              name = _item[0],
              defaultValue = _item[1];

          if (typeof defaultValue === 'boolean') {
            result[name] = name in params ? params[name] : defaultValue;
          } else {
            result[name] = params[name] || defaultValue;
          }
        });
        return result;
      }
    }, {
      key: "_getAnimationStyle",
      value: function _getAnimationStyle() {
        var height = this._height() + this.params.maxSize + 'px';
        var css = "@-webkit-keyframes snowflake_y{from{-webkit-transform:translateY(0px)}to{-webkit-transform:translateY(".concat(height, ");}}\n@keyframes snowflake_y{from{transform:translateY(0px)}to{transform:translateY(").concat(height, ")}}");

        for (var i = 0; i <= Flake.maxInnerSize; i++) {
          var left = (Flake.calcSize(i, this.params) - this.params.minSize) * 4 + 'px';
          css += "@-webkit-keyframes snowflake_x_".concat(i, "{from{-webkit-transform:translateX(0px)}to{-webkit-transform:translateX(").concat(left, ");}}\n@keyframes snowflake_x_").concat(i, "{from{transform:translateX(0px)}to{transform:translateX(").concat(left, ")}}");
        }

        return css;
      }
    }, {
      key: "_updateAnimationStyle",
      value: function _updateAnimationStyle() {
        injectStyle(this._getAnimationStyle(), this._animationStyleNode);
      }
    }, {
      key: "_removeStyle",
      value: function _removeStyle() {
        Snowflakes._count--;

        if (Snowflakes._count <= 0) {
          Snowflakes._count = 0;
          removeNode(Snowflakes._mainStyleNode);
          delete Snowflakes._mainStyleNode;
        }

        removeNode(this._animationStyleNode);
        delete this._animationStyleNode;
        removeNode(this._imagesStyleNode);
        delete this._imagesStyleNode;
      }
    }, {
      key: "_height",
      value: function _height() {
        return this.params.height || (this._isBody ? this._winHeight : this.params.container.offsetHeight + this.params.maxSize);
      }
    }]);

    return Snowflakes;
  }();

  function index (params) {
    return new Snowflakes(params);
  }

  return index;

}));