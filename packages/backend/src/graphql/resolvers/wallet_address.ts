import { assetToGraphql } from './asset'
import {
  QueryResolvers,
  ResolversTypes,
  WalletAddress as SchemaWalletAddress,
  MutationResolvers,
  WalletAddressStatus
} from '../generated/graphql'
import { ApolloContext } from '../../app'
import {
  WalletAddressError,
  isWalletAddressError,
  errorToCode,
  errorToMessage
} from '../../open_payments/wallet_address/errors'
import { WalletAddress } from '../../open_payments/wallet_address/model'
import { getPageInfo } from '../../shared/pagination'
import { Pagination, SortOrder } from '../../shared/baseModel'
import { WalletAddressAdditionalProperty } from '../../open_payments/wallet_address/additional_property/model'
import {
  CreateOptions,
  UpdateOptions
} from '../../open_payments/wallet_address/service'

export const getWalletAddresses: QueryResolvers<ApolloContext>['walletAddresses'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['WalletAddressesConnection']> => {
    const walletAddressService = await ctx.container.use('walletAddressService')
    const { sortOrder, ...pagination } = args
    const order = sortOrder === 'ASC' ? SortOrder.Asc : SortOrder.Desc
    const walletAddresses = await walletAddressService.getPage(
      pagination,
      order
    )
    const pageInfo = await getPageInfo({
      getPage: (pagination: Pagination, sortOrder?: SortOrder) =>
        walletAddressService.getPage(pagination, sortOrder),
      page: walletAddresses,
      sortOrder: order
    })
    return {
      pageInfo,
      edges: walletAddresses.map((walletAddress: WalletAddress) => ({
        cursor: walletAddress.id,
        node: walletAddressToGraphql(walletAddress)
      }))
    }
  }

export const getWalletAddress: QueryResolvers<ApolloContext>['walletAddress'] =
  async (parent, args, ctx): Promise<ResolversTypes['WalletAddress']> => {
    const walletAddressService = await ctx.container.use('walletAddressService')
    const walletAddress = await walletAddressService.get(args.id)
    if (!walletAddress) {
      throw new Error('No wallet address')
    }
    return walletAddressToGraphql(walletAddress)
  }

export const createWalletAddress: MutationResolvers<ApolloContext>['createWalletAddress'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['CreateWalletAddressMutationResponse']> => {
    const walletAddressService = await ctx.container.use('walletAddressService')
    const addProps: WalletAddressAdditionalProperty[] = []
    if (args.input.additionalProperties)
      args.input.additionalProperties.forEach((inputAddProp) => {
        const toAdd = new WalletAddressAdditionalProperty()
        toAdd.fieldKey = inputAddProp.key
        toAdd.fieldValue = inputAddProp.value
        toAdd.visibleInOpenPayments = inputAddProp.visibleInOpenPayments
        addProps.push(toAdd)
      })

    const options: CreateOptions = {
      assetId: args.input.assetId,
      additionalProperties: addProps,
      publicName: args.input.publicName,
      url: args.input.url
    }
    return walletAddressService
      .create(options)
      .then((walletAddressOrError: WalletAddress | WalletAddressError) =>
        isWalletAddressError(walletAddressOrError)
          ? {
              code: errorToCode[walletAddressOrError].toString(),
              success: false,
              message: errorToMessage[walletAddressOrError]
            }
          : {
              code: '200',
              success: true,
              message: 'Created wallet address',
              walletAddress: walletAddressToGraphql(walletAddressOrError)
            }
      )
      .catch(() => ({
        code: '500',
        success: false,
        message: 'Error trying to create wallet address'
      }))
  }
export const updateWalletAddress: MutationResolvers<ApolloContext>['updateWalletAddress'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['UpdateWalletAddressMutationResponse']> => {
    const walletAddressService = await ctx.container.use('walletAddressService')
    const { additionalProperties, ...rest } = args.input
    const updateOptions: UpdateOptions = {
      ...rest
    }
    if (additionalProperties) {
      updateOptions.additionalProperties = additionalProperties.map(
        (property) => {
          return {
            fieldKey: property.key,
            fieldValue: property.value,
            visibleInOpenPayments: property.visibleInOpenPayments
          }
        }
      )
    }
    return walletAddressService
      .update(updateOptions)
      .then((walletAddressOrError: WalletAddress | WalletAddressError) =>
        isWalletAddressError(walletAddressOrError)
          ? {
              code: errorToCode[walletAddressOrError].toString(),
              success: false,
              message: errorToMessage[walletAddressOrError]
            }
          : {
              code: '200',
              success: true,
              message: 'Updated wallet address',
              walletAddress: walletAddressToGraphql(walletAddressOrError)
            }
      )
      .catch(() => ({
        code: '500',
        success: false,
        message: 'Error trying to update wallet address'
      }))
  }

export const triggerWalletAddressEvents: MutationResolvers<ApolloContext>['triggerWalletAddressEvents'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['TriggerWalletAddressEventsMutationResponse']> => {
    try {
      const walletAddressService = await ctx.container.use(
        'walletAddressService'
      )
      const count = await walletAddressService.triggerEvents(args.input.limit)
      return {
        code: '200',
        success: true,
        message: 'Triggered Wallet Address Events',
        count
      }
    } catch (err) {
      ctx.logger.error(
        {
          options: args.input.limit,
          err
        },
        'error triggering wallet address events'
      )
      return {
        code: '500',
        message: 'Error trying to trigger wallet address events',
        success: false
      }
    }
  }

export const walletAddressToGraphql = (
  walletAddress: WalletAddress
): SchemaWalletAddress => ({
  id: walletAddress.id,
  url: walletAddress.url,
  asset: assetToGraphql(walletAddress.asset),
  publicName: walletAddress.publicName ?? undefined,
  createdAt: new Date(+walletAddress.createdAt).toISOString(),
  status: walletAddress.isActive
    ? WalletAddressStatus.Active
    : WalletAddressStatus.Inactive
})
