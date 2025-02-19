import {
  h,
  defineComponent,
  Fragment,
  ref,
  withDirectives,
  Transition,
  vShow,
  watch,
  computed,
  CSSProperties,
  PropType,
  toRef,
  onBeforeUnmount,
  VNode
} from 'vue'
import { zindexable } from 'vdirs'
import { useIsMounted } from 'vooks'
import { LazyTeleport } from 'vueuc'
import { on, off } from 'evtd'
import { beforeNextFrameOnce } from 'seemly'
import {
  RotateClockwiseIcon,
  RotateCounterclockwiseIcon,
  ZoomInIcon,
  ZoomOutIcon
} from '../../_internal/icons'
import { useLocale, useTheme } from '../../_mixins'
import { NBaseIcon } from '../../_internal'
import { NTooltip } from '../../tooltip'
import { imageLight } from '../styles'
import { prevIcon, nextIcon, closeIcon } from './icons'
import type { MoveStrategy } from './interface'
import { imagePreviewSharedProps } from './interface'
import style from './styles/index.cssr'

export interface ImagePreviewInst {
  setThumbnailEl: (e: HTMLImageElement | null) => void
  setPreviewSrc: (src?: string) => void
  toggleShow: () => void
}

export default defineComponent({
  name: 'ImagePreview',
  props: {
    ...imagePreviewSharedProps,
    onNext: Function as PropType<() => void>,
    onPrev: Function as PropType<() => void>,
    clsPrefix: {
      type: String,
      required: true
    }
  },
  setup (props) {
    const themeRef = useTheme(
      'Image',
      '-image',
      style,
      imageLight,
      props,
      toRef(props, 'clsPrefix')
    )
    let thumbnailEl: HTMLImageElement | null = null
    const previewRef = ref<HTMLImageElement | null>(null)
    const previewWrapperRef = ref<HTMLDivElement | null>(null)
    const previewSrcRef = ref<string | undefined>(undefined)
    const showRef = ref(false)
    const displayedRef = ref(false)
    const { localeRef } = useLocale('Image')

    function syncTransformOrigin (): void {
      const { value: previewWrapper } = previewWrapperRef
      if (!thumbnailEl || !previewWrapper) return
      const { style } = previewWrapper
      const tbox = thumbnailEl.getBoundingClientRect()
      const tx = tbox.left + tbox.width / 2
      const ty = tbox.top + tbox.height / 2
      style.transformOrigin = `${tx}px ${ty}px`
    }

    function handleKeydown (e: KeyboardEvent): void {
      switch (e.code) {
        case 'ArrowLeft':
          props.onPrev?.()
          break
        case 'ArrowRight':
          props.onNext?.()
          break
        case 'Escape':
          toggleShow()
          break
      }
    }

    watch(showRef, (value) => {
      if (value) on('keydown', document, handleKeydown)
      else off('keydown', document, handleKeydown)
    })

    onBeforeUnmount(() => {
      off('keydown', document, handleKeydown)
    })

    let startX = 0
    let startY = 0
    let offsetX = 0
    let offsetY = 0
    let startOffsetX = 0
    let startOffsetY = 0
    let mouseDownClientX = 0
    let mouseDownClientY = 0

    let dragging = false
    function handleMouseMove (e: MouseEvent): void {
      const { clientX, clientY } = e
      offsetX = clientX - startX
      offsetY = clientY - startY
      beforeNextFrameOnce(derivePreviewStyle)
    }
    function getMoveStrategy (opts: {
      mouseUpClientX: number
      mouseUpClientY: number
      mouseDownClientX: number
      mouseDownClientY: number
    }): MoveStrategy {
      const {
        mouseUpClientX,
        mouseUpClientY,
        mouseDownClientX,
        mouseDownClientY
      } = opts
      const deltaHorizontal = mouseDownClientX - mouseUpClientX
      const deltaVertical = mouseDownClientY - mouseUpClientY
      const moveVerticalDirection:
      | 'verticalTop'
      | 'verticalBottom' = `vertical${deltaVertical > 0 ? 'Top' : 'Bottom'}`
      const moveHorizontalDirection:
      | 'horizontalLeft'
      | 'horizontalRight' = `horizontal${
        deltaHorizontal > 0 ? 'Left' : 'Right'
      }`

      return {
        moveVerticalDirection,
        moveHorizontalDirection,
        deltaHorizontal,
        deltaVertical
      }
    }
    // avoid image move outside viewport
    function getDerivedOffset (moveStrategy?: MoveStrategy): {
      offsetX: number
      offsetY: number
    } {
      const { value: preview } = previewRef
      if (!preview) return { offsetX: 0, offsetY: 0 }
      const pbox = preview.getBoundingClientRect()
      const {
        moveVerticalDirection,
        moveHorizontalDirection,
        deltaHorizontal,
        deltaVertical
      } = moveStrategy || {}

      let nextOffsetX = 0
      let nextOffsetY = 0
      if (pbox.width <= window.innerWidth) {
        nextOffsetX = 0
      } else if (pbox.left > 0) {
        nextOffsetX = (pbox.width - window.innerWidth) / 2
      } else if (pbox.right < window.innerWidth) {
        nextOffsetX = -(pbox.width - window.innerWidth) / 2
      } else if (moveHorizontalDirection === 'horizontalRight') {
        nextOffsetX = Math.min(
          (pbox.width - window.innerWidth) / 2,
          startOffsetX - (deltaHorizontal ?? 0)
        )
      } else {
        nextOffsetX = Math.max(
          -((pbox.width - window.innerWidth) / 2),
          startOffsetX - (deltaHorizontal ?? 0)
        )
      }

      if (pbox.height <= window.innerHeight) {
        nextOffsetY = 0
      } else if (pbox.top > 0) {
        nextOffsetY = (pbox.height - window.innerHeight) / 2
      } else if (pbox.bottom < window.innerHeight) {
        nextOffsetY = -(pbox.height - window.innerHeight) / 2
      } else if (moveVerticalDirection === 'verticalBottom') {
        nextOffsetY = Math.min(
          (pbox.height - window.innerHeight) / 2,
          startOffsetY - (deltaVertical ?? 0)
        )
      } else {
        nextOffsetY = Math.max(
          -((pbox.height - window.innerHeight) / 2),
          startOffsetY - (deltaVertical ?? 0)
        )
      }

      return {
        offsetX: nextOffsetX,
        offsetY: nextOffsetY
      }
    }
    function handleMouseUp (e: MouseEvent): void {
      off('mousemove', document, handleMouseMove)
      off('mouseup', document, handleMouseUp)
      const { clientX: mouseUpClientX, clientY: mouseUpClientY } = e
      dragging = false
      const moveStrategy = getMoveStrategy({
        mouseUpClientX,
        mouseUpClientY,
        mouseDownClientX,
        mouseDownClientY
      })
      const offset = getDerivedOffset(moveStrategy)
      offsetX = offset.offsetX
      offsetY = offset.offsetY
      derivePreviewStyle()
    }
    function handlePreviewMousedown (e: MouseEvent): void {
      const { clientX, clientY } = e
      dragging = true
      startX = clientX - offsetX
      startY = clientY - offsetY
      startOffsetX = offsetX
      startOffsetY = offsetY

      mouseDownClientX = clientX
      mouseDownClientY = clientY

      derivePreviewStyle()
      on('mousemove', document, handleMouseMove)
      on('mouseup', document, handleMouseUp)
    }
    function handlePreviewDblclick (): void {
      scale = scale === 1 ? 2 : 1
      derivePreviewStyle()
    }

    let scale = 1
    let rotate = 0
    function handleSwitchPrev (): void {
      scale = 1
      rotate = 0
      props.onPrev?.()
    }
    function handleSwitchNext (): void {
      scale = 1
      rotate = 0
      props.onNext?.()
    }
    function rotateCounterclockwise (): void {
      rotate -= 90
      derivePreviewStyle()
    }
    function rotateClockwise (): void {
      rotate += 90
      derivePreviewStyle()
    }
    function zoomIn (): void {
      if (scale < 3) {
        scale += 0.5
        derivePreviewStyle()
      }
    }
    function zoomOut (): void {
      if (scale > 0.5) {
        scale -= 0.5
        derivePreviewStyle(false)
        const offset = getDerivedOffset()
        scale += 0.5
        derivePreviewStyle(false)
        scale -= 0.5
        offsetX = offset.offsetX
        offsetY = offset.offsetY
        derivePreviewStyle()
      }
    }

    function derivePreviewStyle (transition: boolean = true): void {
      const { value: preview } = previewRef
      if (!preview) return
      const { style } = preview
      const transformStyle = `transform-origin: center; transform: translateX(${offsetX}px) translateY(${offsetY}px) rotate(${rotate}deg) scale(${scale});`
      if (dragging) {
        style.cssText = 'cursor: grabbing; transition: none;' + transformStyle
      } else {
        style.cssText =
          'cursor: grab;' +
          transformStyle +
          (transition ? '' : 'transition: none;')
      }
      if (!transition) {
        void preview.offsetHeight
      }
    }

    function toggleShow (): void {
      showRef.value = !showRef.value
      displayedRef.value = true
    }
    const exposedMethods: ImagePreviewInst = {
      setPreviewSrc: (src) => {
        previewSrcRef.value = src
      },
      setThumbnailEl: (el) => {
        thumbnailEl = el
      },
      toggleShow
    }

    function withTooltip (
      node: VNode,
      tooltipKey: keyof typeof localeRef.value
    ): VNode {
      if (props.showToolbarTooltip) {
        const { value: theme } = themeRef
        return (
          <NTooltip
            to={false}
            theme={theme.peers.Tooltip}
            themeOverrides={theme.peerOverrides.Tooltip}
          >
            {{
              default: () => {
                return localeRef.value[tooltipKey]
              },
              trigger: () => node
            }}
          </NTooltip>
        )
      } else {
        return node
      }
    }

    return {
      previewRef,
      previewWrapperRef,
      previewSrc: previewSrcRef,
      show: showRef,
      appear: useIsMounted(),
      displayed: displayedRef,
      handleWheel (e: WheelEvent) {
        e.preventDefault()
      },
      handlePreviewMousedown,
      handlePreviewDblclick,
      syncTransformOrigin,
      handleAfterLeave: () => {
        rotate = 0
        scale = 1
        displayedRef.value = false
      },
      handleDragStart: (e: Event) => {
        e.preventDefault()
      },
      zoomIn,
      zoomOut,
      rotateCounterclockwise,
      rotateClockwise,
      handleSwitchPrev,
      handleSwitchNext,
      withTooltip,
      cssVars: computed(() => {
        const {
          common: { cubicBezierEaseInOut },
          self: {
            toolbarIconColor,
            toolbarBorderRadius,
            toolbarBoxShadow,
            toolbarColor
          }
        } = themeRef.value
        return {
          '--n-bezier': cubicBezierEaseInOut,
          '--n-toolbar-icon-color': toolbarIconColor,
          '--n-toolbar-color': toolbarColor,
          '--n-toolbar-border-radius': toolbarBorderRadius,
          '--n-toolbar-box-shadow': toolbarBoxShadow
        }
      }),
      ...exposedMethods
    }
  },
  render () {
    const { clsPrefix } = this
    return (
      <>
        {this.$slots.default?.()}
        <LazyTeleport show={this.show}>
          {{
            default: () =>
              this.show || this.displayed
                ? withDirectives(
                    <div
                      class={`${clsPrefix}-image-preview-container`}
                      style={this.cssVars as CSSProperties}
                      onWheel={this.handleWheel}
                    >
                      <Transition
                        name="fade-in-transition"
                        appear={this.appear}
                      >
                        {{
                          default: () =>
                            this.show ? (
                              <div
                                class={`${clsPrefix}-image-preview-overlay`}
                                onClick={this.toggleShow}
                              />
                            ) : null
                        }}
                      </Transition>
                      {this.showToolbar ? (
                        <Transition
                          name="fade-in-transition"
                          appear={this.appear}
                        >
                          {{
                            default: () => {
                              if (!this.show) return null
                              const { withTooltip } = this
                              return (
                                <div
                                  class={`${clsPrefix}-image-preview-toolbar`}
                                >
                                  {this.onPrev ? (
                                    <>
                                      {withTooltip(
                                        <NBaseIcon
                                          clsPrefix={clsPrefix}
                                          onClick={this.handleSwitchPrev}
                                        >
                                          {{ default: () => prevIcon }}
                                        </NBaseIcon>,
                                        'tipPrevious'
                                      )}
                                      {withTooltip(
                                        <NBaseIcon
                                          clsPrefix={clsPrefix}
                                          onClick={this.handleSwitchNext}
                                        >
                                          {{ default: () => nextIcon }}
                                        </NBaseIcon>,
                                        'tipNext'
                                      )}
                                    </>
                                  ) : null}
                                  {withTooltip(
                                    <NBaseIcon
                                      clsPrefix={clsPrefix}
                                      onClick={this.rotateCounterclockwise}
                                    >
                                      {{
                                        default: () => (
                                          <RotateCounterclockwiseIcon />
                                        )
                                      }}
                                    </NBaseIcon>,
                                    'tipCounterclockwise'
                                  )}
                                  {withTooltip(
                                    <NBaseIcon
                                      clsPrefix={clsPrefix}
                                      onClick={this.rotateClockwise}
                                    >
                                      {{
                                        default: () => <RotateClockwiseIcon />
                                      }}
                                    </NBaseIcon>,
                                    'tipClockwise'
                                  )}
                                  {withTooltip(
                                    <NBaseIcon
                                      clsPrefix={clsPrefix}
                                      onClick={this.zoomOut}
                                    >
                                      {{ default: () => <ZoomOutIcon /> }}
                                    </NBaseIcon>,
                                    'tipZoomOut'
                                  )}
                                  {withTooltip(
                                    <NBaseIcon
                                      clsPrefix={clsPrefix}
                                      onClick={this.zoomIn}
                                    >
                                      {{ default: () => <ZoomInIcon /> }}
                                    </NBaseIcon>,
                                    'tipZoomIn'
                                  )}
                                  {withTooltip(
                                    <NBaseIcon
                                      clsPrefix={clsPrefix}
                                      onClick={this.toggleShow}
                                    >
                                      {{ default: () => closeIcon }}
                                    </NBaseIcon>,
                                    'tipClose'
                                  )}
                                </div>
                              )
                            }
                          }}
                        </Transition>
                      ) : null}
                      <Transition
                        name="fade-in-scale-up-transition"
                        onAfterLeave={this.handleAfterLeave}
                        appear={this.appear}
                        // BUG:
                        // onEnter will be called twice, I don't know why
                        // Maybe it is a bug of vue
                        onEnter={this.syncTransformOrigin}
                        onBeforeLeave={this.syncTransformOrigin}
                      >
                        {{
                          default: () =>
                            withDirectives(
                              <div
                                class={`${clsPrefix}-image-preview-wrapper`}
                                ref="previewWrapperRef"
                              >
                                <img
                                  draggable={false}
                                  onMousedown={this.handlePreviewMousedown}
                                  onDblclick={this.handlePreviewDblclick}
                                  class={`${clsPrefix}-image-preview`}
                                  key={this.previewSrc}
                                  src={this.previewSrc}
                                  ref="previewRef"
                                  onDragstart={this.handleDragStart}
                                />
                              </div>,
                              [[vShow, this.show]]
                            )
                        }}
                      </Transition>
                    </div>,
                    [[zindexable, { enabled: this.show }]]
                )
                : null
          }}
        </LazyTeleport>
      </>
    )
  }
})
