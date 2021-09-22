import { Asset } from './asset'
import {
  AccountDeposit,
  LiquidityDeposit,
  Deposit,
  DepositError
} from './deposit'
import { IlpAccount } from './ilpAccount'
import { IlpBalance } from './ilpBalance'
import {
  CreditOptions,
  ExtendCreditOptions,
  SettleDebtOptions,
  CreditError
} from './credit'
import { Transfer, Transaction, TransferError } from './transfer'
import {
  AccountWithdrawal,
  LiquidityWithdrawal,
  Withdrawal,
  WithdrawError
} from './withdrawal'

export interface ConnectorAccountsService {
  getAccount(accountId: string): Promise<IlpAccount | undefined>
  getAccountByDestinationAddress(
    destinationAddress: string
  ): Promise<IlpAccount | undefined>
  getAccountByToken(token: string): Promise<IlpAccount | undefined>
  transferFunds(args: Transfer): Promise<Transaction | TransferError>
  getAddress(accountId: string): Promise<string | undefined>
}

export interface AccountsService extends ConnectorAccountsService {
  createAccount(
    account: CreateOptions
  ): Promise<IlpAccount | CreateAccountError>
  updateAccount(
    accountOptions: UpdateOptions
  ): Promise<IlpAccount | UpdateAccountError>
  getSubAccounts(accountId: string): Promise<IlpAccount[]>
  getAccountBalance(accountId: string): Promise<IlpBalance | undefined>
  depositLiquidity(deposit: LiquidityDeposit): Promise<void | DepositError>
  withdrawLiquidity(
    withdrawal: LiquidityWithdrawal
  ): Promise<void | WithdrawError>
  getLiquidityBalance(asset: Asset): Promise<bigint | undefined>
  getSettlementBalance(asset: Asset): Promise<bigint | undefined>
  deposit(deposit: AccountDeposit): Promise<Deposit | DepositError>
  createWithdrawal(
    withdrawal: AccountWithdrawal
  ): Promise<Withdrawal | WithdrawError>
  finalizeWithdrawal(id: string): Promise<void | WithdrawError>
  rollbackWithdrawal(id: string): Promise<void | WithdrawError>
  extendCredit(extendOptions: ExtendCreditOptions): Promise<void | CreditError>
  utilizeCredit(utilizeOptions: CreditOptions): Promise<void | CreditError>
  revokeCredit(revokeOptions: CreditOptions): Promise<void | CreditError>
  settleDebt(settleOptions: SettleDebtOptions): Promise<void | CreditError>
  getAccountsPage(options: {
    pagination?: Pagination
    superAccountId?: string
  }): Promise<IlpAccount[]>
}

export interface Pagination {
  after?: string // Forward pagination: cursor.
  before?: string // Backward pagination: cursor.
  first?: number // Forward pagination: limit.
  last?: number // Backward pagination: limit.
}

export type Options = Omit<
  IlpAccount,
  'id' | 'disabled' | 'asset' | 'superAccountId' | 'stream'
> & {
  id?: string
  disabled?: boolean
  stream?: {
    enabled: boolean
  }
  http?: {
    incoming?: {
      authTokens: string[]
    }
  }
}

export type CreateAccountOptions = Options & {
  asset: Asset
  superAccountId?: never
}

export type CreateSubAccountOptions = Options & {
  asset?: never
  superAccountId: string
}

export type CreateOptions = CreateAccountOptions | CreateSubAccountOptions

export function isSubAccount(
  account: CreateOptions
): account is CreateSubAccountOptions {
  return (account as CreateSubAccountOptions).superAccountId !== undefined
}

export enum CreateAccountError {
  DuplicateAccountId = 'DuplicateAccountId',
  DuplicateIncomingToken = 'DuplicateIncomingToken',
  UnknownSuperAccount = 'UnknownSuperAccount'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const isCreateAccountError = (o: any): o is CreateAccountError =>
  Object.values(CreateAccountError).includes(o)

export type UpdateOptions = Options & {
  id: string
}

export enum UpdateAccountError {
  DuplicateIncomingToken = 'DuplicateIncomingToken',
  UnknownAccount = 'UnknownAccount'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const isUpdateAccountError = (o: any): o is UpdateAccountError =>
  Object.values(UpdateAccountError).includes(o)