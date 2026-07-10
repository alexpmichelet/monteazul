/**
 * Stringified inline script that patches Node#removeChild / Node#insertBefore
 * to fail soft when a third party (machine translator, browser extension)
 * mutated the DOM behind React's back. Inject as the first <script> in
 * <body>, before hydration.
 */
export declare const DOM_RESILIENCE_SCRIPT: string;
