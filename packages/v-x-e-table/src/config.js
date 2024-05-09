import GlobalConfig from './conf'
import DomZIndex from 'dom-zindex'
import XEUtils from 'xe-utils'
import { setTheme } from './theme'

/**
 * 全局参数设置
 */
export function config (options) {
  if (options) {
    setTheme(options)
    if (options.zIndex) {
      DomZIndex.setCurrent(options.zIndex)
    }
  }
  return XEUtils.merge(GlobalConfig, options)
}
