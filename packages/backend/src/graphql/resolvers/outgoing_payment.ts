import { quoteToGraphql } from './quote'
import {
  MutationResolvers,
  OutgoingPayment as SchemaOutgoingPayment,
  WalletAddressResolvers,
  QueryResolvers,
  ResolversTypes
} from '../generated/graphql'
import {
  OutgoingPaymentError,
  isOutgoingPaymentError,
  errorToCode,
  errorToMessage
} from '../../open_payments/payment/outgoing/errors'
import { OutgoingPayment } from '../../open_payments/payment/outgoing/model'
import { ApolloContext } from '../../app'
import { getPageInfo } from '../../shared/pagination'
import { Pagination, SortOrder } from '../../shared/baseModel'

export const getOutgoingPayment: QueryResolvers<ApolloContext>['outgoingPayment'] =
  async (parent, args, ctx): Promise<ResolversTypes['OutgoingPayment']> => {
    const outgoingPaymentService = await ctx.container.use(
      'outgoingPaymentService'
    )
    const payment = await outgoingPaymentService.get({
      id: args.id
    })
    if (!payment) throw new Error('payment does not exist')
    return paymentToGraphql(payment)
  }

export const cancelOutgoingPayment: MutationResolvers<ApolloContext>['cancelOutgoingPayment'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['OutgoingPaymentResponse']> => {
    const outgoingPaymentService = await ctx.container.use(
      'outgoingPaymentService'
    )

    return outgoingPaymentService
      .cancel(args.input)
      .then((paymentOrError: OutgoingPayment | OutgoingPaymentError) =>
        isOutgoingPaymentError(paymentOrError)
          ? {
              code: errorToCode[paymentOrError].toString(),
              success: false,
              message: errorToMessage[paymentOrError]
            }
          : {
              code: '200',
              success: true,
              payment: paymentToGraphql(paymentOrError)
            }
      )
      .catch(() => ({
        code: '500',
        success: false,
        message: 'Error trying to cancel outgoing payment'
      }))
  }

export const createOutgoingPayment: MutationResolvers<ApolloContext>['createOutgoingPayment'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['OutgoingPaymentResponse']> => {
    const outgoingPaymentService = await ctx.container.use(
      'outgoingPaymentService'
    )
    return outgoingPaymentService
      .create(args.input)
      .then((paymentOrErr: OutgoingPayment | OutgoingPaymentError) =>
        isOutgoingPaymentError(paymentOrErr)
          ? {
              code: errorToCode[paymentOrErr].toString(),
              success: false,
              message: errorToMessage[paymentOrErr]
            }
          : {
              code: '201',
              success: true,
              payment: paymentToGraphql(paymentOrErr)
            }
      )
      .catch(() => ({
        code: '500',
        success: false,
        message: 'Error trying to create outgoing payment'
      }))
  }

export const createOutgoingPaymentFromIncomingPayment: MutationResolvers<ApolloContext>['createOutgoingPaymentFromIncomingPayment'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['OutgoingPaymentResponse']> => {
    const outgoingPaymentService = await ctx.container.use(
      'outgoingPaymentService'
    )
    return outgoingPaymentService
      .create(args.input)
      .then((paymentOrErr: OutgoingPayment | OutgoingPaymentError) =>
        isOutgoingPaymentError(paymentOrErr)
          ? {
              code: errorToCode[paymentOrErr].toString(),
              success: false,
              message: errorToMessage[paymentOrErr]
            }
          : {
              code: '201',
              success: true,
              payment: paymentToGraphql(paymentOrErr)
            }
      )
      .catch(() => ({
        code: '500',
        success: false,
        message: 'Error trying to create outgoing payment'
      }))
  }

export const getWalletAddressOutgoingPayments: WalletAddressResolvers<ApolloContext>['outgoingPayments'] =
  async (
    parent,
    args,
    ctx
  ): Promise<ResolversTypes['OutgoingPaymentConnection']> => {
    if (!parent.id) throw new Error('missing wallet address id')
    const outgoingPaymentService = await ctx.container.use(
      'outgoingPaymentService'
    )
    const { sortOrder, ...pagination } = args
    const order = sortOrder === 'ASC' ? SortOrder.Asc : SortOrder.Desc
    const outgoingPayments = await outgoingPaymentService.getWalletAddressPage({
      walletAddressId: parent.id,
      pagination,
      sortOrder: order
    })
    const pageInfo = await getPageInfo({
      getPage: (pagination: Pagination, sortOrder?: SortOrder) =>
        outgoingPaymentService.getWalletAddressPage({
          walletAddressId: parent.id as string,
          pagination,
          sortOrder
        }),
      page: outgoingPayments,
      sortOrder: order
    })
    return {
      pageInfo,
      edges: outgoingPayments.map((payment: OutgoingPayment) => ({
        cursor: payment.id,
        node: paymentToGraphql(payment)
      }))
    }
  }

export function paymentToGraphql(
  payment: OutgoingPayment
): SchemaOutgoingPayment {
  return {
    id: payment.id,
    walletAddressId: payment.walletAddressId,
    client: payment.client,
    state: payment.state,
    error: payment.error,
    stateAttempts: payment.stateAttempts,
    receiver: payment.receiver,
    debitAmount: payment.debitAmount,
    sentAmount: payment.sentAmount,
    receiveAmount: payment.receiveAmount,
    metadata: payment.metadata,
    createdAt: new Date(+payment.createdAt).toISOString(),
    quote: quoteToGraphql(payment.quote)
  }
}
