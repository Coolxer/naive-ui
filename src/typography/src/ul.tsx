import { h, defineComponent, computed, CSSProperties } from 'vue'
import { useConfig, useTheme } from '../../_mixins'
import type { ThemeProps } from '../../_mixins'
import { typographyLight } from '../styles'
import type { TypographyTheme } from '../styles'
import style from './styles/list.cssr'
import type { ExtractPublicPropTypes } from '../../_utils'

const ulProps = {
  ...(useTheme.props as ThemeProps<TypographyTheme>),
  alignText: Boolean
} as const

export type UlProps = ExtractPublicPropTypes<typeof ulProps>

export default defineComponent({
  name: 'Ul',
  props: ulProps,
  setup (props) {
    const { mergedClsPrefixRef } = useConfig(props)
    const themeRef = useTheme(
      'Typography',
      '-xl',
      style,
      typographyLight,
      props,
      mergedClsPrefixRef
    )
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      cssVars: computed(() => {
        const {
          common: { cubicBezierEaseInOut },
          self: {
            olPadding,
            ulPadding,
            liMargin,
            liTextColor,
            liLineHeight,
            liFontSize
          }
        } = themeRef.value
        return {
          '--n-bezier': cubicBezierEaseInOut,
          '--n-font-size': liFontSize,
          '--n-line-height': liLineHeight,
          '--n-text-color': liTextColor,
          '--n-li-margin': liMargin,
          '--n-ol-padding': olPadding,
          '--n-ul-padding': ulPadding
        }
      })
    }
  },
  render () {
    const { mergedClsPrefix } = this
    return (
      <ul
        class={[
          `${mergedClsPrefix}-ul`,
          this.alignText && `${mergedClsPrefix}-ul--align-text`
        ]}
        style={this.cssVars as CSSProperties}
      >
        {this.$slots}
      </ul>
    )
  }
})
