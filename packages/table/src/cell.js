import XEUtils from 'xe-utils'
import GlobalConfig from '../../v-x-e-table/src/conf'
import VXETable from '../../v-x-e-table'
import DomTools from '../../tools/dom'
import UtilTools, { eqEmptyValue, isEnableConf, getFuncText } from '../../tools/utils'
import { getRowid, getColumnConfig } from './util'
import { getSlotVNs } from '../../tools/vn'

function renderTitlePrefixIcon (h, params) {
  const { $table, column } = params
  const titlePrefix = column.titlePrefix || column.titleHelp
  return titlePrefix ? [
    h('i', {
      class: ['vxe-cell-title-prefix-icon', titlePrefix.icon || GlobalConfig.icon.TABLE_TITLE_PREFIX],
      on: {
        mouseenter (evnt) {
          $table.triggerHeaderTitleEvent(evnt, titlePrefix, params)
        },
        mouseleave (evnt) {
          $table.handleTargetLeaveEvent(evnt)
        }
      }
    })
  ] : []
}

function renderTitleSuffixIcon (h, params) {
  const { $table, column } = params
  const titleSuffix = column.titleSuffix
  return titleSuffix ? [
    h('i', {
      class: ['vxe-cell-title-suffix-icon', titleSuffix.icon || GlobalConfig.icon.TABLE_TITLE_SUFFIX],
      on: {
        mouseenter (evnt) {
          $table.triggerHeaderTitleEvent(evnt, titleSuffix, params)
        },
        mouseleave (evnt) {
          $table.handleTargetLeaveEvent(evnt)
        }
      }
    })
  ] : []
}

function renderTitleContent (h, params, content) {
  const { $table, column } = params
  const { type, showHeaderOverflow } = column
  const { showHeaderOverflow: allColumnHeaderOverflow, tooltipOpts } = $table
  const showAllTip = tooltipOpts.showAll || tooltipOpts.enabled
  const headOverflow = XEUtils.isUndefined(showHeaderOverflow) || XEUtils.isNull(showHeaderOverflow) ? allColumnHeaderOverflow : showHeaderOverflow
  const showTitle = headOverflow === 'title'
  const showTooltip = headOverflow === true || headOverflow === 'tooltip'
  const ons = {}
  if (showTitle || showTooltip || showAllTip) {
    ons.mouseenter = evnt => {
      if ($table._isResize) {
        return
      }
      if (showTitle) {
        DomTools.updateCellTitle(evnt.currentTarget, column)
      } else if (showTooltip || showAllTip) {
        $table.triggerHeaderTooltipEvent(evnt, params)
      }
    }
  }
  if (showTooltip || showAllTip) {
    ons.mouseleave = evnt => {
      if ($table._isResize) {
        return
      }
      if (showTooltip || showAllTip) {
        $table.handleTargetLeaveEvent(evnt)
      }
    }
  }
  return [
    type === 'html' && XEUtils.isString(content) ? h('span', {
      class: 'vxe-cell--title',
      domProps: {
        innerHTML: content
      },
      on: ons
    }) : h('span', {
      class: 'vxe-cell--title',
      on: ons
    }, getSlotVNs(content))
  ]
}

function getFooterContent (h, params) {
  const { $table, column, _columnIndex, row, items } = params
  const { slots, editRender, cellRender } = column
  const renderOpts = editRender || cellRender
  if (slots && slots.footer) {
    return $table.callSlot(slots.footer, params, h)
  }
  if (renderOpts) {
    const compConf = VXETable.renderer.get(renderOpts.name)
    if (compConf && compConf.renderFooter) {
      return getSlotVNs(compConf.renderFooter.call($table, h, renderOpts, params))
    }
  }
  // 兼容老模式
  if (XEUtils.isArray(items)) {
    return [UtilTools.formatText(items[_columnIndex], 1)]
  }
  return [UtilTools.formatText(XEUtils.get(row, column.field), 1)]
}

function getDefaultCellLabel (params) {
  const { $table, row, column } = params
  return UtilTools.formatText($table.getCellLabel(row, column), 1)
}

export const Cell = {
  createColumn ($xetable, _vm) {
    const { type, sortable, remoteSort, filters, editRender, treeNode } = _vm
    const { editConfig, editOpts, checkboxOpts } = $xetable
    const renMaps = {
      renderHeader: this.renderDefaultHeader,
      renderCell: treeNode ? this.renderTreeCell : this.renderDefaultCell,
      renderFooter: this.renderDefaultFooter
    }
    switch (type) {
      case 'seq':
        renMaps.renderHeader = this.renderSeqHeader
        renMaps.renderCell = treeNode ? this.renderTreeIndexCell : this.renderSeqCell
        break
      case 'radio':
        renMaps.renderHeader = this.renderRadioHeader
        renMaps.renderCell = treeNode ? this.renderTreeRadioCell : this.renderRadioCell
        break
      case 'checkbox':
        renMaps.renderHeader = this.renderCheckboxHeader
        renMaps.renderCell = checkboxOpts.checkField ? (treeNode ? this.renderTreeSelectionCellByProp : this.renderCheckboxCellByProp) : (treeNode ? this.renderTreeSelectionCell : this.renderCheckboxCell)
        break
      case 'expand':
        renMaps.renderCell = this.renderExpandCell
        renMaps.renderData = this.renderExpandData
        break
      case 'html':
        renMaps.renderCell = treeNode ? this.renderTreeHTMLCell : this.renderHTMLCell
        if (filters && (sortable || remoteSort)) {
          renMaps.renderHeader = this.renderSortAndFilterHeader
        } else if (sortable || remoteSort) {
          renMaps.renderHeader = this.renderSortHeader
        } else if (filters) {
          renMaps.renderHeader = this.renderFilterHeader
        }
        break
      default:
        if (editConfig && editRender) {
          renMaps.renderHeader = this.renderEditHeader
          renMaps.renderCell = editOpts.mode === 'cell' ? (treeNode ? this.renderTreeCellEdit : this.renderCellEdit) : (treeNode ? this.renderTreeRowEdit : this.renderRowEdit)
        } else if (filters && (sortable || remoteSort)) {
          renMaps.renderHeader = this.renderSortAndFilterHeader
        } else if (sortable || remoteSort) {
          renMaps.renderHeader = this.renderSortHeader
        } else if (filters) {
          renMaps.renderHeader = this.renderFilterHeader
        }
    }
    return getColumnConfig($xetable, _vm, renMaps)
  },
  /**
   * 单元格
   */
  renderHeaderTitle (h, params) {
    const { $table, column } = params
    const { slots, editRender, cellRender } = column
    const renderOpts = editRender || cellRender
    if (slots && slots.header) {
      return renderTitleContent(h, params, $table.callSlot(slots.header, params, h))
    }
    if (renderOpts) {
      const compConf = VXETable.renderer.get(renderOpts.name)
      if (compConf && compConf.renderHeader) {
        return getSlotVNs(renderTitleContent(h, params, compConf.renderHeader.call($table, h, renderOpts, params)))
      }
    }
    return renderTitleContent(h, params, UtilTools.formatText(column.getTitle(), 1))
  },
  renderDefaultHeader (h, params) {
    return renderTitlePrefixIcon(h, params).concat(Cell.renderHeaderTitle(h, params)).concat(renderTitleSuffixIcon(h, params))
  },
  renderDefaultCell (h, params) {
    const { $table, row, column } = params
    const { slots, editRender, cellRender } = column
    const renderOpts = editRender || cellRender
    if (slots && slots.default) {
      return $table.callSlot(slots.default, params, h)
    }
    if (renderOpts) {
      const funName = editRender ? 'renderCell' : 'renderDefault'
      const compConf = VXETable.renderer.get(renderOpts.name)
      if (compConf && compConf[funName]) {
        return getSlotVNs(compConf[funName].call($table, h, renderOpts, Object.assign({ $type: editRender ? 'edit' : 'cell' }, params)))
      }
    }
    const cellValue = $table.getCellLabel(row, column)
    const cellPlaceholder = editRender ? editRender.placeholder : ''
    return [
      h('span', {
        class: 'vxe-cell--label'
      }, editRender && eqEmptyValue(cellValue) ? [
        // 如果设置占位符
        h('span', {
          class: 'vxe-cell--placeholder'
        }, UtilTools.formatText(getFuncText(cellPlaceholder), 1))
      ] : UtilTools.formatText(cellValue, 1))
    ]
  },
  renderTreeCell (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderDefaultCell.call(this, h, params))
  },
  renderDefaultFooter (h, params) {
    return [
      h('span', {
        class: 'vxe-cell--item'
      }, getFooterContent(h, params))
    ]
  },

  /**
   * 树节点
   */
  renderTreeIcon (h, params, cellVNodes) {
    const { $table, isHidden } = params
    const { treeOpts, treeExpandedMaps, treeExpandLazyLoadedMaps } = $table
    const { row, column, level } = params
    const { slots } = column
    const { indent, lazy, trigger, iconLoaded, showIcon, iconOpen, iconClose } = treeOpts
    const childrenField = treeOpts.children || treeOpts.childrenField
    const hasChildField = treeOpts.hasChild || treeOpts.hasChildField
    const rowChilds = row[childrenField]
    let hasLazyChilds = false
    let isAceived = false
    let isLazyLoaded = false
    const on = {}
    if (slots && slots.icon) {
      return $table.callSlot(slots.icon, params, h, cellVNodes)
    }
    if (!isHidden) {
      const rowid = getRowid($table, row)
      isAceived = !!treeExpandedMaps[rowid]
      if (lazy) {
        isLazyLoaded = !!treeExpandLazyLoadedMaps[rowid]
        hasLazyChilds = row[hasChildField]
      }
    }
    if (!trigger || trigger === 'default') {
      on.click = evnt => {
        evnt.stopPropagation()
        $table.triggerTreeExpandEvent(evnt, params)
      }
    }
    return [
      h('div', {
        class: ['vxe-cell--tree-node', {
          'is--active': isAceived
        }],
        style: {
          paddingLeft: `${level * indent}px`
        }
      }, [
        showIcon && ((rowChilds && rowChilds.length) || hasLazyChilds) ? [
          h('div', {
            class: 'vxe-tree--btn-wrapper',
            on
          }, [
            h('i', {
              class: ['vxe-tree--node-btn', isLazyLoaded ? (iconLoaded || GlobalConfig.icon.TABLE_TREE_LOADED) : (isAceived ? (iconOpen || GlobalConfig.icon.TABLE_TREE_OPEN) : (iconClose || GlobalConfig.icon.TABLE_TREE_CLOSE))]
            })
          ])
        ] : null,
        h('div', {
          class: 'vxe-tree-cell'
        }, cellVNodes)
      ])
    ]
  },

  /**
   * 索引
   */
  renderSeqHeader (h, params) {
    const { $table, column } = params
    const { slots } = column
    return renderTitleContent(h, params, slots && slots.header ? $table.callSlot(slots.header, params, h) : UtilTools.formatText(column.getTitle(), 1))
  },
  renderSeqCell (h, params) {
    const { $table, column } = params
    const { treeConfig, seqOpts } = $table
    const { slots } = column
    if (slots && slots.default) {
      return $table.callSlot(slots.default, params, h)
    }
    const { seq } = params
    const seqMethod = seqOpts.seqMethod
    return [UtilTools.formatText(seqMethod ? seqMethod(params) : treeConfig ? seq : (seqOpts.startIndex || 0) + seq, 1)]
  },
  renderTreeIndexCell (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderSeqCell(h, params))
  },

  /**
   * 单选
   */
  renderRadioHeader (h, params) {
    const { $table, column } = params
    const { slots } = column
    const headerSlot = slots ? slots.header : null
    const titleSlot = slots ? slots.title : null
    return renderTitleContent(h, params, headerSlot ? $table.callSlot(headerSlot, params, h) : [
      h('span', {
        class: 'vxe-radio--label'
      }, titleSlot ? $table.callSlot(titleSlot, params, h) : UtilTools.formatText(column.getTitle(), 1))
    ])
  },
  renderRadioCell (h, params) {
    const { $table, column, isHidden } = params
    const { radioOpts, selectRadioRow } = $table
    const { slots } = column
    const { labelField, checkMethod, visibleMethod } = radioOpts
    const { row } = params
    const defaultSlot = slots ? slots.default : null
    const radioSlot = slots ? slots.radio : null
    const isChecked = row === selectRadioRow
    const isVisible = !visibleMethod || visibleMethod({ row })
    let isDisabled = !!checkMethod
    let on
    if (!isHidden) {
      on = {
        click (evnt) {
          if (!isDisabled && isVisible) {
            evnt.stopPropagation()
            $table.triggerRadioRowEvent(evnt, params)
          }
        }
      }
      if (checkMethod) {
        isDisabled = !checkMethod({ row })
      }
    }
    const radioParams = { ...params, checked: isChecked, disabled: isDisabled, visible: isVisible }
    if (radioSlot) {
      return $table.callSlot(radioSlot, radioParams, h)
    }
    const radioVNs = []
    if (isVisible) {
      radioVNs.push(
        h('span', {
          class: ['vxe-radio--icon', isChecked ? GlobalConfig.icon.TABLE_RADIO_CHECKED : GlobalConfig.icon.TABLE_RADIO_UNCHECKED]
        })
      )
    }
    if (defaultSlot || labelField) {
      radioVNs.push(
        h('span', {
          class: 'vxe-radio--label'
        }, defaultSlot ? $table.callSlot(defaultSlot, radioParams, h) : XEUtils.get(row, labelField))
      )
    }
    return [
      h('span', {
        class: ['vxe-cell--radio', {
          'is--checked': isChecked,
          'is--disabled': isDisabled
        }],
        on
      }, radioVNs)
    ]
  },
  renderTreeRadioCell (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderRadioCell(h, params))
  },

  /**
   * 多选
   */
  renderCheckboxHeader (h, params) {
    const { $table, column, isHidden } = params
    const { isAllSelected: isAllCheckboxSelected, isIndeterminate: isAllCheckboxIndeterminate, isAllCheckboxDisabled } = $table
    const { slots } = column
    const headerSlot = slots ? slots.header : null
    const titleSlot = slots ? slots.title : null
    const checkboxOpts = $table.checkboxOpts
    const headerTitle = column.getTitle()
    let on
    if (!isHidden) {
      on = {
        click (evnt) {
          if (!isAllCheckboxDisabled) {
            evnt.stopPropagation()
            $table.triggerCheckAllEvent(evnt, !isAllCheckboxSelected)
          }
        }
      }
    }
    const checkboxParams = { ...params, checked: isAllCheckboxSelected, disabled: isAllCheckboxDisabled, indeterminate: isAllCheckboxIndeterminate }
    if (headerSlot) {
      return renderTitleContent(h, checkboxParams, $table.callSlot(headerSlot, checkboxParams, h))
    }
    if (checkboxOpts.checkStrictly ? !checkboxOpts.showHeader : checkboxOpts.showHeader === false) {
      return renderTitleContent(h, checkboxParams, [
        h('span', {
          class: 'vxe-checkbox--label'
        }, titleSlot ? $table.callSlot(titleSlot, checkboxParams, h) : headerTitle)
      ])
    }
    return renderTitleContent(h, checkboxParams, [
      h('span', {
        class: ['vxe-cell--checkbox', {
          'is--checked': isAllCheckboxSelected,
          'is--disabled': isAllCheckboxDisabled,
          'is--indeterminate': isAllCheckboxIndeterminate
        }],
        attrs: {
          title: GlobalConfig.i18n('vxe.table.allTitle')
        },
        on
      }, [
        h('span', {
          class: ['vxe-checkbox--icon', isAllCheckboxIndeterminate ? GlobalConfig.icon.TABLE_CHECKBOX_INDETERMINATE : (isAllCheckboxSelected ? GlobalConfig.icon.TABLE_CHECKBOX_CHECKED : GlobalConfig.icon.TABLE_CHECKBOX_UNCHECKED)]
        })
      ].concat(titleSlot || headerTitle ? [
        h('span', {
          class: 'vxe-checkbox--label'
        }, titleSlot ? $table.callSlot(titleSlot, checkboxParams, h) : headerTitle)
      ] : []))
    ])
  },
  renderCheckboxCell (h, params) {
    const { $table, row, column, isHidden } = params
    const { treeConfig, treeIndeterminateMaps, selectCheckboxMaps } = $table
    const { labelField, checkMethod, visibleMethod } = $table.checkboxOpts
    const { slots } = column
    const defaultSlot = slots ? slots.default : null
    const checkboxSlot = slots ? slots.checkbox : null
    let indeterminate = false
    let isChecked = false
    const isVisible = !visibleMethod || visibleMethod({ row })
    let isDisabled = !!checkMethod
    let on
    if (!isHidden) {
      const rowid = getRowid($table, row)
      isChecked = !!selectCheckboxMaps[rowid]
      on = {
        click (evnt) {
          if (!isDisabled && isVisible) {
            evnt.stopPropagation()
            $table.triggerCheckRowEvent(evnt, params, !isChecked)
          }
        }
      }
      if (checkMethod) {
        isDisabled = !checkMethod({ row })
      }
      if (treeConfig) {
        indeterminate = !!treeIndeterminateMaps[rowid]
      }
    }
    const checkboxParams = { ...params, checked: isChecked, disabled: isDisabled, visible: isVisible, indeterminate }
    if (checkboxSlot) {
      return $table.callSlot(checkboxSlot, checkboxParams, h)
    }
    const checkVNs = []
    if (isVisible) {
      checkVNs.push(
        h('span', {
          class: ['vxe-checkbox--icon', indeterminate ? GlobalConfig.icon.TABLE_CHECKBOX_INDETERMINATE : (isChecked ? GlobalConfig.icon.TABLE_CHECKBOX_CHECKED : GlobalConfig.icon.TABLE_CHECKBOX_UNCHECKED)]
        })
      )
    }
    if (defaultSlot || labelField) {
      checkVNs.push(
        h('span', {
          class: 'vxe-checkbox--label'
        }, defaultSlot ? $table.callSlot(defaultSlot, checkboxParams, h) : XEUtils.get(row, labelField))
      )
    }
    return [
      h('span', {
        class: ['vxe-cell--checkbox', {
          'is--checked': isChecked,
          'is--disabled': isDisabled,
          'is--indeterminate': indeterminate,
          'is--hidden': !isVisible
        }],
        on
      }, checkVNs)
    ]
  },
  renderTreeSelectionCell (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderCheckboxCell(h, params))
  },
  renderCheckboxCellByProp (h, params) {
    const { $table, row, column, isHidden } = params
    const { treeConfig, treeIndeterminateMaps, checkboxOpts } = $table
    const { labelField, checkField, checkMethod, visibleMethod } = checkboxOpts
    const indeterminateField = checkboxOpts.indeterminateField || checkboxOpts.halfField
    const { slots } = column
    const defaultSlot = slots ? slots.default : null
    const checkboxSlot = slots ? slots.checkbox : null
    let isIndeterminate = false
    let isChecked = false
    const isVisible = !visibleMethod || visibleMethod({ row })
    let isDisabled = !!checkMethod
    let on
    if (!isHidden) {
      const rowid = getRowid($table, row)
      isChecked = XEUtils.get(row, checkField)
      on = {
        click (evnt) {
          if (!isDisabled && isVisible) {
            evnt.stopPropagation()
            $table.triggerCheckRowEvent(evnt, params, !isChecked)
          }
        }
      }
      if (checkMethod) {
        isDisabled = !checkMethod({ row })
      }
      if (treeConfig) {
        isIndeterminate = !!treeIndeterminateMaps[rowid]
      }
    }
    const checkboxParams = { ...params, checked: isChecked, disabled: isDisabled, visible: isVisible, indeterminate: isIndeterminate }
    if (checkboxSlot) {
      return $table.callSlot(checkboxSlot, checkboxParams, h)
    }
    const checkVNs = []
    if (isVisible) {
      checkVNs.push(
        h('span', {
          class: ['vxe-checkbox--icon', isIndeterminate ? GlobalConfig.icon.TABLE_CHECKBOX_INDETERMINATE : (isChecked ? GlobalConfig.icon.TABLE_CHECKBOX_CHECKED : GlobalConfig.icon.TABLE_CHECKBOX_UNCHECKED)]
        })
      )
    }
    if (defaultSlot || labelField) {
      checkVNs.push(
        h('span', {
          class: 'vxe-checkbox--label'
        }, defaultSlot ? $table.callSlot(defaultSlot, checkboxParams, h) : XEUtils.get(row, labelField))
      )
    }
    return [
      h('span', {
        class: ['vxe-cell--checkbox', {
          'is--checked': isChecked,
          'is--disabled': isDisabled,
          'is--indeterminate': indeterminateField && !isChecked ? row[indeterminateField] : isIndeterminate,
          'is--hidden': !isVisible
        }],
        on
      }, checkVNs)
    ]
  },
  renderTreeSelectionCellByProp (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderCheckboxCellByProp(h, params))
  },

  /**
   * 展开行
   */
  renderExpandCell (h, params) {
    const { $table, isHidden, row, column } = params
    const { expandOpts, rowExpandedMaps, rowExpandLazyLoadedMaps } = $table
    const { lazy, labelField, iconLoaded, showIcon, iconOpen, iconClose, visibleMethod } = expandOpts
    const { slots } = column
    const defaultSlot = slots ? slots.default : null
    let isAceived = false
    let isLazyLoaded = false
    if (slots && slots.icon) {
      return $table.callSlot(slots.icon, params, h)
    }
    if (!isHidden) {
      const rowid = getRowid($table, row)
      isAceived = !!rowExpandedMaps[rowid]
      if (lazy) {
        isLazyLoaded = !!rowExpandLazyLoadedMaps[rowid]
      }
    }
    return [
      showIcon && (!visibleMethod || visibleMethod(params)) ? h('span', {
        class: ['vxe-table--expanded', {
          'is--active': isAceived
        }],
        on: {
          click (evnt) {
            evnt.stopPropagation()
            $table.triggerRowExpandEvent(evnt, params)
          }
        }
      }, [
        h('i', {
          class: ['vxe-table--expand-btn', isLazyLoaded ? (iconLoaded || GlobalConfig.icon.TABLE_EXPAND_LOADED) : (isAceived ? (iconOpen || GlobalConfig.icon.TABLE_EXPAND_OPEN) : (iconClose || GlobalConfig.icon.TABLE_EXPAND_CLOSE))]
        })
      ]) : null,
      defaultSlot || labelField ? h('span', {
        class: 'vxe-table--expand-label'
      }, defaultSlot ? $table.callSlot(defaultSlot, params, h) : XEUtils.get(row, labelField)) : null
    ]
  },
  renderExpandData (h, params) {
    const { $table, column } = params
    const { slots, contentRender } = column
    if (slots && slots.content) {
      return $table.callSlot(slots.content, params, h)
    }
    if (contentRender) {
      const compConf = VXETable.renderer.get(contentRender.name)
      if (compConf && compConf.renderExpand) {
        return getSlotVNs(compConf.renderExpand.call($table, h, contentRender, params))
      }
    }
    return []
  },

  /**
   * HTML 标签
   */
  renderHTMLCell (h, params) {
    const { $table, column } = params
    const { slots } = column
    if (slots && slots.default) {
      return $table.callSlot(slots.default, params, h)
    }
    return [
      h('span', {
        class: 'vxe-cell--html',
        domProps: {
          innerHTML: getDefaultCellLabel(params)
        }
      })
    ]
  },
  renderTreeHTMLCell (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderHTMLCell(h, params))
  },

  /**
   * 排序和筛选
   */
  renderSortAndFilterHeader (h, params) {
    return Cell.renderDefaultHeader(h, params)
      .concat(Cell.renderSortIcon(h, params))
      .concat(Cell.renderFilterIcon(h, params))
  },

  /**
   * 排序
   */
  renderSortHeader (h, params) {
    return Cell.renderDefaultHeader(h, params).concat(Cell.renderSortIcon(h, params))
  },
  renderSortIcon (h, params) {
    const { $table, column } = params
    const { showIcon, iconLayout, iconAsc, iconDesc } = $table.sortOpts
    return showIcon ? [
      h('span', {
        class: ['vxe-cell--sort', `vxe-cell--sort-${iconLayout}-layout`]
      }, [
        h('i', {
          class: ['vxe-sort--asc-btn', iconAsc || GlobalConfig.icon.TABLE_SORT_ASC, {
            'sort--active': column.order === 'asc'
          }],
          attrs: {
            title: GlobalConfig.i18n('vxe.table.sortAsc')
          },
          on: {
            click (evnt) {
              evnt.stopPropagation()
              $table.triggerSortEvent(evnt, column, 'asc')
            }
          }
        }),
        h('i', {
          class: ['vxe-sort--desc-btn', iconDesc || GlobalConfig.icon.TABLE_SORT_DESC, {
            'sort--active': column.order === 'desc'
          }],
          attrs: {
            title: GlobalConfig.i18n('vxe.table.sortDesc')
          },
          on: {
            click (evnt) {
              evnt.stopPropagation()
              $table.triggerSortEvent(evnt, column, 'desc')
            }
          }
        })
      ])
    ] : []
  },

  /**
   * 筛选
   */
  renderFilterHeader (h, params) {
    return Cell.renderDefaultHeader(h, params).concat(Cell.renderFilterIcon(h, params))
  },
  renderFilterIcon (h, params) {
    const { $table, column, hasFilter } = params
    const { filterStore, filterOpts } = $table
    const { showIcon, iconNone, iconMatch } = filterOpts
    return showIcon ? [
      h('span', {
        class: ['vxe-cell--filter', {
          'is--active': filterStore.visible && filterStore.column === column
        }]
      }, [
        h('i', {
          class: ['vxe-filter--btn', hasFilter ? (iconMatch || GlobalConfig.icon.TABLE_FILTER_MATCH) : (iconNone || GlobalConfig.icon.TABLE_FILTER_NONE)],
          attrs: {
            title: GlobalConfig.i18n('vxe.table.filter')
          },
          on: {
            click (evnt) {
              if ($table.triggerFilterEvent) {
                $table.triggerFilterEvent(evnt, params.column, params)
              }
            }
          }
        })
      ])
    ] : []
  },

  /**
   * 可编辑
   */
  renderEditHeader (h, params) {
    const { $table, column } = params
    const { editConfig, editRules, editOpts } = $table
    const { sortable, remoteSort, filters, editRender } = column
    let isRequired = false
    if (editRules) {
      const columnRules = XEUtils.get(editRules, column.field)
      if (columnRules) {
        isRequired = columnRules.some(rule => rule.required)
      }
    }
    return (isEnableConf(editConfig) ? [
      isRequired && editOpts.showAsterisk ? h('i', {
        class: 'vxe-cell--required-icon'
      }) : null,
      isEnableConf(editRender) && editOpts.showIcon ? h('i', {
        class: ['vxe-cell--edit-icon', editOpts.icon || GlobalConfig.icon.TABLE_EDIT]
      }) : null
    ] : []).concat(Cell.renderDefaultHeader(h, params))
      .concat(sortable || remoteSort ? Cell.renderSortIcon(h, params) : [])
      .concat(filters ? Cell.renderFilterIcon(h, params) : [])
  },
  // 行格编辑模式
  renderRowEdit (h, params) {
    const { $table, column } = params
    const { editRender } = column
    const { actived } = $table.editStore
    return Cell.runRenderer(h, params, this, isEnableConf(editRender) && actived && actived.row === params.row)
  },
  renderTreeRowEdit (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderRowEdit(h, params))
  },
  // 单元格编辑模式
  renderCellEdit (h, params) {
    const { $table, column } = params
    const { editRender } = column
    const { actived } = $table.editStore
    return Cell.runRenderer(h, params, this, isEnableConf(editRender) && actived && actived.row === params.row && actived.column === params.column)
  },
  renderTreeCellEdit (h, params) {
    return Cell.renderTreeIcon(h, params, Cell.renderCellEdit(h, params))
  },
  runRenderer (h, params, _vm, isEdit) {
    const { $table, column } = params
    const { slots, editRender, formatter } = column
    const compConf = VXETable.renderer.get(editRender.name)
    if (isEdit) {
      if (slots && slots.edit) {
        return $table.callSlot(slots.edit, params, h)
      }
      if (compConf && compConf.renderEdit) {
        return getSlotVNs(compConf.renderEdit.call($table, h, editRender, Object.assign({ $type: 'edit' }, params)))
      }
      return []
    }
    if (slots && slots.default) {
      return $table.callSlot(slots.default, params, h)
    }
    if (formatter) {
      return [
        h('span', {
          class: 'vxe-cell--label'
        }, [getDefaultCellLabel(params)])
      ]
    }
    return Cell.renderDefaultCell.call(_vm, h, params)
  }
}

export default Cell
