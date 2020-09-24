/* eslint-disable import/prefer-default-export */
import TronWeb from 'tronweb';

export async function getTronAccount(addr) {
    const apiTronHost = global.$STM_Config
        ? global.$STM_Config.tron_host
        : 'https://api.shasta.trongrid.io';
    const tronWeb = new TronWeb({
        fullHost: apiTronHost,
    });
    return await tronWeb.trx.getAccount(addr);
}

export async function transferTrxTo(from, to, amount, memo, privateKey) {
    const apiTronHost = global.$STM_Config
        ? global.$STM_Config.tron_host
        : 'https://api.shasta.trongrid.io';
    const tronWeb = new TronWeb({
        fullHost: apiTronHost,
    });
    const sumAmount = parseInt(amount * 1e6, 10);
    // build tx
    const tx = await tronWeb.transactionBuilder.sendTrx(to, sumAmount, from);
    if (memo) {
        // write memo
        const memoTx = await tronWeb.transactionBuilder.addUpdateData(
            tx,
            memo,
            'utf8'
        );
    }
    // sign
    const signedTx = await tronWeb.trx.sign(tx, privateKey);
    // broadcast
    const trxResult = await tronWeb.trx.sendRawTransaction(signedTx);
    return trxResult;
}
