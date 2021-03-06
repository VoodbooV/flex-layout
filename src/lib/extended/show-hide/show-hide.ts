/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Self,
  Optional,
  Inject,
  PLATFORM_ID,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {
  BaseDirective,
  LAYOUT_CONFIG,
  LayoutConfigOptions,
  MediaChange,
  MediaMonitor,
  SERVER_TOKEN,
  StyleUtils,
} from '@angular/flex-layout/core';
import {FlexDirective, LayoutDirective} from '@angular/flex-layout/flex';
import {Subscription} from 'rxjs';

const FALSY = ['false', false, 0];

/**
 * For fxHide selectors, we invert the 'value'
 * and assign to the equivalent fxShow selector cache
 *  - When 'hide' === '' === true, do NOT show the element
 *  - When 'hide' === false or 0... we WILL show the element
 */
export function negativeOf(hide: any) {
  return (hide === '') ? false :
         ((hide === 'false') || (hide === 0)) ? true : !hide;
}

/**
 * 'show' Layout API directive
 *
 */
@Directive({
  selector: `
  [fxShow],
  [fxShow.xs], [fxShow.sm], [fxShow.md], [fxShow.lg], [fxShow.xl],
  [fxShow.lt-sm], [fxShow.lt-md], [fxShow.lt-lg], [fxShow.lt-xl],
  [fxShow.gt-xs], [fxShow.gt-sm], [fxShow.gt-md], [fxShow.gt-lg],
  [fxHide],
  [fxHide.xs], [fxHide.sm], [fxHide.md], [fxHide.lg], [fxHide.xl],
  [fxHide.lt-sm], [fxHide.lt-md], [fxHide.lt-lg], [fxHide.lt-xl],
  [fxHide.gt-xs], [fxHide.gt-sm], [fxHide.gt-md], [fxHide.gt-lg]
`
})
export class ShowHideDirective extends BaseDirective
  implements OnInit, OnChanges, OnDestroy, AfterViewInit {

  /**
   * Subscription to the parent flex container's layout changes.
   * Stored so we can unsubscribe when this directive is destroyed.
   */
  protected _layoutWatcher?: Subscription;

  /** Original dom Elements CSS display style */
  protected _display: string = '';

  /* tslint:disable */
  @Input('fxShow')       set show(val: string) {  this._cacheInput('show', val);  }
  @Input('fxShow.xs')    set showXs(val: string) {this._cacheInput('showXs', val);}
  @Input('fxShow.sm')    set showSm(val: string) {this._cacheInput('showSm', val); };
  @Input('fxShow.md')    set showMd(val: string) {this._cacheInput('showMd', val); };
  @Input('fxShow.lg')    set showLg(val: string) {this._cacheInput('showLg', val); };
  @Input('fxShow.xl')    set showXl(val: string) {this._cacheInput('showXl', val); };

  @Input('fxShow.lt-sm') set showLtSm(val: string) { this._cacheInput('showLtSm', val); };
  @Input('fxShow.lt-md') set showLtMd(val: string) { this._cacheInput('showLtMd', val); };
  @Input('fxShow.lt-lg') set showLtLg(val: string) { this._cacheInput('showLtLg', val); };
  @Input('fxShow.lt-xl') set showLtXl(val: string) { this._cacheInput('showLtXl', val); };

  @Input('fxShow.gt-xs') set showGtXs(val: string) {this._cacheInput('showGtXs', val); };
  @Input('fxShow.gt-sm') set showGtSm(val: string) {this._cacheInput('showGtSm', val); };
  @Input('fxShow.gt-md') set showGtMd(val: string) {this._cacheInput('showGtMd', val); };
  @Input('fxShow.gt-lg') set showGtLg(val: string) {this._cacheInput('showGtLg', val); };

  @Input('fxHide')       set hide(val: string) {this._cacheInput('show', negativeOf(val));}
  @Input('fxHide.xs')    set hideXs(val: string) {this._cacheInput('showXs', negativeOf(val));}
  @Input('fxHide.sm')    set hideSm(val: string) {this._cacheInput('showSm', negativeOf(val)); };
  @Input('fxHide.md')    set hideMd(val: string) {this._cacheInput('showMd', negativeOf(val)); };
  @Input('fxHide.lg')    set hideLg(val: string) {this._cacheInput('showLg', negativeOf(val)); };
  @Input('fxHide.xl')    set hideXl(val: string) {this._cacheInput('showXl', negativeOf(val)); };

  @Input('fxHide.lt-sm') set hideLtSm(val: string) { this._cacheInput('showLtSm', negativeOf(val)); };
  @Input('fxHide.lt-md') set hideLtMd(val: string) { this._cacheInput('showLtMd', negativeOf(val)); };
  @Input('fxHide.lt-lg') set hideLtLg(val: string) { this._cacheInput('showLtLg', negativeOf(val)); };
  @Input('fxHide.lt-xl') set hideLtXl(val: string) { this._cacheInput('showLtXl', negativeOf(val)); };

  @Input('fxHide.gt-xs') set hideGtXs(val: string) {this._cacheInput('showGtXs', negativeOf(val)); };
  @Input('fxHide.gt-sm') set hideGtSm(val: string) {this._cacheInput('showGtSm', negativeOf(val)); };
  @Input('fxHide.gt-md') set hideGtMd(val: string) {this._cacheInput('showGtMd', negativeOf(val)); };
  @Input('fxHide.gt-lg') set hideGtLg(val: string) {this._cacheInput('showGtLg', negativeOf(val)); };
  /* tslint:enable */

  @ViewChild(FlexDirective) protected _flexChild: FlexDirective | null = null;

  constructor(monitor: MediaMonitor,
              @Optional() @Self() protected layout: LayoutDirective,
              protected elRef: ElementRef,
              protected styleUtils: StyleUtils,
              @Inject(PLATFORM_ID) protected platformId: Object,
              @Optional() @Inject(SERVER_TOKEN) protected serverModuleLoaded: boolean,
              @Inject(LAYOUT_CONFIG) protected layoutConfig: LayoutConfigOptions) {

    super(monitor, elRef, styleUtils);
  }

  // *********************************************
  // Lifecycle Methods
  // *********************************************

  /**
   * Override accessor to the current HTMLElement's `display` style
   * Note: Show/Hide will not change the display to 'flex' but will set it to 'block'
   * unless it was already explicitly specified inline or in a CSS stylesheet.
   */
  protected _getDisplayStyle(): string {
    return (this.layout || (this._flexChild && this.layoutConfig.addFlexToParent)) ?
      'flex' : super._getDisplayStyle();
  }


  /**
   * On changes to any @Input properties...
   * Default to use the non-responsive Input value ('fxShow')
   * Then conditionally override with the mq-activated Input's current value
   */
  ngOnChanges(changes: SimpleChanges) {
    if (this.hasInitialized && (changes['show'] != null || this._mqActivation)) {
      this._updateWithValue();
    }
  }

  /**
   * After the initial onChanges, build an mqActivation object that bridges
   * mql change events to onMediaQueryChange handlers
   */
  ngOnInit() {
    super.ngOnInit();
  }

  ngAfterViewInit() {
    this._display = this._getDisplayStyle();
    if (this.layout) {
      /**
       * The Layout can set the display:flex (and incorrectly affect the Hide/Show directives.
       * Whenever Layout [on the same element] resets its CSS, then update the Hide/Show CSS
       */
      this._layoutWatcher = this.layout.layout$.subscribe(() => this._updateWithValue());
    }
    let value = this._getDefaultVal('show', true);
    // Build _mqActivation controller
    this._listenForMediaQueryChanges('show', value, (changes: MediaChange) => {
      this._updateWithValue(changes.value);
    });
    this._updateWithValue();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    if (this._layoutWatcher) {
      this._layoutWatcher.unsubscribe();
    }
  }

  // *********************************************
  // Protected methods
  // *********************************************

  /** Validate the visibility value and then update the host's inline display style */
  protected _updateWithValue(value?: string|number|boolean) {
    value = value || this._getDefaultVal('show', true);
    if (this._mqActivation) {
      value = this._mqActivation.activatedInput;
    }

    let shouldShow = this._validateTruthy(value);
    this._applyStyleToElement(this._buildCSS(shouldShow));
    if (isPlatformServer(this.platformId) && this.serverModuleLoaded) {
      this.nativeElement.style.setProperty('display', '');
    }
  }


  /** Build the CSS that should be assigned to the element instance */
  protected _buildCSS(show: boolean) {
    return {'display': show ? this._display : 'none'};
  }

  /**  Validate the to be not FALSY */
  _validateTruthy(show: string | number | boolean = '') {
    return (FALSY.indexOf(show) === -1);
  }
}
