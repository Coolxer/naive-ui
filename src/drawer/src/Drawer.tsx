import {
  h,
  PropType,
  defineComponent,
  computed,
  provide,
  CSSProperties,
  withDirectives,
  Transition,
  watchEffect
} from 'vue'
import { VLazyTeleport } from 'vueuc'
import { zindexable } from 'vdirs'
import { useIsMounted } from 'vooks'
import { useTheme, useConfig } from '../../_mixins'
import type { ThemeProps } from '../../_mixins'
import { formatLength, call, warnOnce } from '../../_utils'
import type { ExtractPublicPropTypes, MaybeArray } from '../../_utils'
import { ScrollbarProps } from '../../_internal'
import { drawerLight, DrawerTheme } from '../styles'
import NDrawerBodyWrapper from './DrawerBodyWrapper'
import type { Placement } from './DrawerBodyWrapper'
import { drawerInjectionKey } from './interface'
import style from './styles/index.cssr'

const drawerProps = {
  ...(useTheme.props as ThemeProps<DrawerTheme>),
  show: Boolean,
  width: {
    type: [Number, String] as PropType<string | number>,
    default: 251
  },
  height: {
    type: [Number, String] as PropType<string | number>,
    default: 251
  },
  placement: {
    type: String as PropType<Placement>,
    default: 'right'
  },
  maskClosable: {
    type: Boolean,
    default: true
  },
  to: [String, Object] as PropType<string | HTMLElement>,
  displayDirective: {
    type: String as PropType<'if' | 'show'>,
    default: 'if'
  },
  nativeScrollbar: {
    type: Boolean,
    default: true
  },
  zIndex: Number,
  onMaskClick: Function as PropType<(e: MouseEvent) => void>,
  scrollbarProps: Object as PropType<ScrollbarProps>,
  contentStyle: [Object, String] as PropType<string | CSSProperties>,
  trapFocus: {
    type: Boolean,
    default: true
  },
  onEsc: Function as PropType<() => void>,
  autoFocus: {
    type: Boolean,
    default: true
  },
  closeOnEsc: {
    type: Boolean,
    default: true
  },
  'onUpdate:show': [Function, Array] as PropType<
  MaybeArray<(value: boolean) => void>
  >,
  onUpdateShow: [Function, Array] as PropType<
  MaybeArray<(value: boolean) => void>
  >,
  /** @deprecated */
  drawerStyle: [String, Object] as PropType<string | CSSProperties>,
  drawerClass: String,
  target: null,
  onShow: Function as PropType<(value: boolean) => void>,
  onHide: Function as PropType<(value: boolean) => void>
} as const

export type DrawerProps = ExtractPublicPropTypes<typeof drawerProps>

export default defineComponent({
  name: 'Drawer',
  inheritAttrs: false,
  props: drawerProps,
  setup (props) {
    if (__DEV__) {
      watchEffect(() => {
        if (props.drawerStyle !== undefined) {
          warnOnce(
            'drawer',
            '`drawer-style` is deprecated, please use `style` instead.'
          )
        }
        if (props.drawerClass !== undefined) {
          warnOnce(
            'drawer',
            '`drawer-class` is deprecated, please use `class` instead.'
          )
        }
        if (props.target !== undefined) {
          warnOnce('drawer', '`target` is deprecated, please use `to` instead.')
        }
        if (props.onShow !== undefined) {
          warnOnce(
            'drawer',
            '`on-show` is deprecated, please use `on-update:show` instead.'
          )
        }
        if (props.onHide !== undefined) {
          warnOnce(
            'drawer',
            '`on-hide` is deprecated, please use `on-update:show` instead.'
          )
        }
      })
    }
    const { mergedClsPrefixRef, namespaceRef } = useConfig(props)
    const isMountedRef = useIsMounted()
    const themeRef = useTheme(
      'Drawer',
      '-drawer',
      style,
      drawerLight,
      props,
      mergedClsPrefixRef
    )
    const styleWidthRef = computed(() => {
      const { placement } = props
      if (placement === 'top' || placement === 'bottom') return ''
      const { width } = props
      return formatLength(width)
    })
    const styleHeightRef = computed(() => {
      const { placement } = props
      if (placement === 'left' || placement === 'right') return ''
      const { height } = props
      return formatLength(height)
    })
    const mergedBodyStyleRef = computed(() => {
      return [
        {
          width: styleWidthRef.value,
          height: styleHeightRef.value
        },
        props.drawerStyle
      ]
    })
    function handleMaskClick (e: MouseEvent): void {
      const { onMaskClick, maskClosable } = props
      if (maskClosable) {
        doUpdateShow(false)
      }
      if (onMaskClick) onMaskClick(e)
    }
    function handleEsc (): void {
      props.onEsc?.()
      if (props.closeOnEsc) {
        doUpdateShow(false)
      }
    }
    function doUpdateShow (show: boolean): void {
      const { onHide, onUpdateShow, 'onUpdate:show': _onUpdateShow } = props
      if (onUpdateShow) call(onUpdateShow, show)
      if (_onUpdateShow) call(_onUpdateShow, show)
      // deprecated
      if (onHide && !show) call(onHide, show)
    }
    provide(drawerInjectionKey, {
      isMountedRef: isMountedRef,
      mergedThemeRef: themeRef,
      mergedClsPrefixRef,
      doUpdateShow
    })
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      namespace: namespaceRef,
      mergedBodyStyle: mergedBodyStyleRef,
      handleMaskClick,
      handleEsc,
      mergedTheme: themeRef,
      cssVars: computed(() => {
        const {
          common: {
            cubicBezierEaseInOut,
            cubicBezierEaseIn,
            cubicBezierEaseOut
          },
          self: {
            color,
            textColor,
            boxShadow,
            lineHeight,
            headerPadding,
            footerPadding,
            bodyPadding,
            titleFontSize,
            titleTextColor,
            titleFontWeight,
            headerBorderBottom,
            footerBorderTop,
            closeColor,
            closeColorHover,
            closeColorPressed,
            closeSize
          }
        } = themeRef.value
        return {
          '--n-line-height': lineHeight,
          '--n-color': color,
          '--n-text-color': textColor,
          '--n-box-shadow': boxShadow,
          '--n-bezier': cubicBezierEaseInOut,
          '--n-bezier-out': cubicBezierEaseOut,
          '--n-bezier-in': cubicBezierEaseIn,
          '--n-header-padding': headerPadding,
          '--n-body-padding': bodyPadding,
          '--n-footer-padding': footerPadding,
          '--n-title-text-color': titleTextColor,
          '--n-title-font-size': titleFontSize,
          '--n-title-font-weight': titleFontWeight,
          '--n-header-border-bottom': headerBorderBottom,
          '--n-footer-border-top': footerBorderTop,
          '--n-close-color': closeColor,
          '--n-close-color-hover': closeColorHover,
          '--n-close-color-pressed': closeColorPressed,
          '--n-close-size': closeSize
        }
      }),
      isMounted: isMountedRef
    }
  },
  render () {
    const { mergedClsPrefix } = this
    return (
      <VLazyTeleport to={this.to} show={this.show}>
        {{
          default: () => {
            return withDirectives(
              <div
                class={[`${mergedClsPrefix}-drawer-container`, this.namespace]}
                style={this.cssVars as CSSProperties}
                role="none"
              >
                <Transition name="fade-in-transition" appear={this.isMounted}>
                  {{
                    default: () =>
                      this.show ? (
                        <div
                          aria-hidden
                          class={`${mergedClsPrefix}-drawer-mask`}
                          onClick={this.handleMaskClick}
                        />
                      ) : null
                  }}
                </Transition>
                <NDrawerBodyWrapper
                  {...this.$attrs}
                  class={[this.drawerClass, this.$attrs.class]}
                  style={[this.mergedBodyStyle, this.$attrs.style]}
                  contentStyle={this.contentStyle}
                  placement={this.placement}
                  scrollbarProps={this.scrollbarProps}
                  show={this.show}
                  displayDirective={this.displayDirective}
                  nativeScrollbar={this.nativeScrollbar}
                  trapFocus={this.trapFocus}
                  autoFocus={this.autoFocus}
                  onEsc={this.handleEsc}
                >
                  {this.$slots}
                </NDrawerBodyWrapper>
              </div>,
              [[zindexable, { zIndex: this.zIndex, enabled: this.show }]]
            )
          }
        }}
      </VLazyTeleport>
    )
  }
})
