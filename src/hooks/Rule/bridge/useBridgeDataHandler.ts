import { checkNOmitFromObj, utf8Decode, utf8Encode } from '@/common/tools'
import useI18nTl from '@/hooks/useI18nTl'
import useSSL from '@/hooks/useSSL'
import { BridgeType } from '@/types/enum'
import { FormItemRule } from 'element-plus'
import { cloneDeep, omit } from 'lodash'
import { useBridgeTypeOptions } from './useBridgeTypeValue'

const BRIDGE_NAME_REG = /^[A-Za-z0-9]+[A-Za-z0-9-_]*$/
export const useBridgeFormRules = (): { nameRule: Array<FormItemRule> } => {
  const { tl } = useI18nTl('RuleEngine')
  const nameRule = [
    {
      pattern: BRIDGE_NAME_REG,
      message: tl('nameRegError'),
    },
  ]

  return {
    nameRule,
  }
}

export default (): {
  handleBridgeDataBeforeSubmit: (bridgeData: any) => Promise<any>
  handleBridgeDataAfterLoaded: (bridgeData: any) => any
  handleBridgeDataForCopy: (bridgeData: any) => any
  handleBridgeDataForSaveAsCopy: (bridgeData: any) => any
} => {
  const { handleSSLDataBeforeSubmit } = useSSL()
  const { getBridgeType } = useBridgeTypeOptions()

  const handleMQTTBridgeData = (bridgeData: any) => {
    const { egress, ingress } = bridgeData
    if (!egress.remote?.topic) {
      Reflect.deleteProperty(bridgeData, 'egress')
    } else if (!ingress.remote?.topic) {
      Reflect.deleteProperty(bridgeData, 'ingress')
    }
    return bridgeData
  }

  const handleWebhookBridgeData = (bridgeData: any) => {
    if (bridgeData.body) {
      bridgeData.body = utf8Encode(bridgeData.body)
    }
    return bridgeData
  }

  const keysNeedDel = {
    update: ['node_status', 'status'],
    saveAsCopy: ['node_status', 'status', 'enable', 'id'],
    copy: ['node_status', 'status', 'enable', 'id', 'password'],
  }

  const handleBridgeDataBeforeSubmit = async (bridgeData: any): Promise<any> => {
    try {
      let ret = cloneDeep(bridgeData)
      const bridgeType = getBridgeType(bridgeData.type)
      if (ret.ssl) {
        ret.ssl = handleSSLDataBeforeSubmit(ret.ssl)
      }
      if (bridgeType === BridgeType.MQTT) {
        ret = await handleMQTTBridgeData(ret)
      } else if (bridgeType === BridgeType.Webhook) {
        ret = await handleWebhookBridgeData(ret)
      }
      return Promise.resolve(checkNOmitFromObj(omit(ret, keysNeedDel.update)))
    } catch (error) {
      console.error(error)
      return Promise.reject()
    }
  }

  const handleBridgeDataAfterLoaded = (bridgeData: any) => {
    const bridgeType = getBridgeType(bridgeData.type)
    if (bridgeType === BridgeType.Webhook && 'body' in bridgeData) {
      bridgeData.body = utf8Decode(bridgeData.body)
    }
    return bridgeData
  }

  const handleBridgeDataForCopy = (bridgeData: any): any => {
    return omit(handleBridgeDataAfterLoaded(bridgeData), keysNeedDel.copy)
  }

  const handleBridgeDataForSaveAsCopy = (bridgeData: any): any => {
    return omit(bridgeData, keysNeedDel.saveAsCopy)
  }

  return {
    handleBridgeDataBeforeSubmit,
    handleBridgeDataAfterLoaded,
    handleBridgeDataForCopy,
    handleBridgeDataForSaveAsCopy,
  }
}
