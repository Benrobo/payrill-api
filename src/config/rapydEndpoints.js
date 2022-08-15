
// Any endpoints which contain a dynamic attribute wont be included here.
// Dynamic attribute endpoint look like this `/v1/users/{:userId}/{:wallId}`

module.exports = {
    // RAPYD WALLETS SECTION
    // fetchWalletById: `/v1/user/:ewallet_id`,
    createPersonalWallet: `/v1/user`,
    createCompanyWallet: `/v1/user`,
    updateWallet: `/v1/user`,
    disableWallet: `/v1/user/disable`,
    enableWallet: `/v1/user/enable`,
    // deleteWallet: `/v1/user/:wallet`,
    verifyIdentity: `/v1/identities`,
    allIdentityTypes: `/v1/identities/types`,
    allIdentityByTypes: `/v1/identities/types`,
    transferFundsBtwWallets: `/v1/account/transfer`,
    // listWalletTransactions: `/v1/user/:wallet/transactions`,
    // listWalletTransactionsByType: `/v1/user/:wallet/transactions`,
    // retrieveWalletBalance: `/v1/user/:wallet/accounts`,
    // getWalletTransferDetails: `/v1/user/:wallet/transactions/:transaction`,
    // addContactToWallet: `/v1/ewallets/:ewallet/contacts`,
    // getWalletTransferDetails: `/v1/user/:wallet/transactions/:transaction`,
}