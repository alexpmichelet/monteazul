/**
 * Inline script (stringified so the apps can inject it before hydration) that
 * makes React survive third-party DOM mutation — machine translators wrap
 * TextNodes in <font> elements, password managers and adblockers move or
 * remove nodes — which otherwise crashes reconciliation with
 * "NotFoundError: Failed to execute 'removeChild' on 'Node'".
 *
 * This is the well-known workaround from facebook/react#11538: make the two
 * mutations React relies on fail soft instead of throwing. It prevents the
 * crash only — text already swapped by a translator can go stale until its
 * parent re-renders — which is why the admin app ALSO opts out of machine
 * translation entirely (translate="no"): it is already in its users' language
 * and stale admin data is worse than no translation.
 *
 * Must run before React hydrates: inject as the first <script> in <body>.
 */
export const DOM_RESILIENCE_SCRIPT = `(function () {
  if (typeof Node !== "function" || !Node.prototype) return;
  var removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return removeChild.apply(this, arguments);
  };
  var insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }
    return insertBefore.apply(this, arguments);
  };
})();`;
