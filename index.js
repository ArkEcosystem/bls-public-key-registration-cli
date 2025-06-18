const { Transactions, Identities, Managers } = require('@arkecosystem/crypto');
const { newBlsPublicKey, oldBlsPublicKey, passphrase, secondPassphrase, peer, network } = require('./config.json');
const { httpie } = require('@arkecosystem/core-utils');

const retrieveSenderNonce = async () => {
  const address = Identities.Address.fromPassphrase(passphrase);
  const publicKey = Identities.PublicKey.fromPassphrase(passphrase);

  console.log(`Retrieving nonce for Address ${address}, Public Key: ${publicKey}`);

  try {
    const response = await httpie.get(`${peer}/api/wallets/${address}`);
    return Number(response.body.data.nonce);
  } catch (err) {
    console.error(`Cannot retrieve nonce for address ${address}: ${err.message}`);
    return 0;
  }
};

const postTransaction = async (tx) => {
  try {
    const response = await httpie.post(`${peer}/api/transactions`, {
      headers: { 'Content-Type': 'application/json', port: 4003 },
      body: {
        transactions: [tx.toJson()],
      },
    });

    if (response.status !== 200 || response.body.errors) {
      console.log('Fail: ', JSON.stringify(response.body));

      return response.body;
    } else {
      console.log('Success: ', JSON.stringify(response.body));

      return response.body;
    }
  } catch (ex) {
    console.log('Exception: ', JSON.stringify(ex.message));
  }
};

const buildTransaction = async (nonce) => {
  const builder = Transactions.BuilderFactory.blsPublicKeyRegistration();

  const tx = await builder
    .version(2)
    .nonce(nonce)
    .blsPublicKeyAsset({
      newBlsPublicKey: newBlsPublicKey,
      oldBlsPublicKey: oldBlsPublicKey.length > 0 ? oldBlsPublicKey : undefined,
    })
    .sign(passphrase);

  if (secondPassphrase !== '') {
    tx.secondSign(secondPassphrase);
  }

  const buildTransaction = await tx.build();

  return buildTransaction;
};

const main = async () => {
  Managers.configManager.setFromPreset(network);

  console.log('New BLS Public Key: ', newBlsPublicKey);
  console.log('Old BLS Public Key: ', oldBlsPublicKey.length > 0 ? oldBlsPublicKey : 'None');
  console.log('Passphrase: ', passphrase);

  const nonce = await retrieveSenderNonce();

  console.log(`Nonce: ${nonce}`);

  const tx = await buildTransaction(nonce + 1);
  console.log(tx.toJson());

  await new Promise((resolve) => setTimeout(resolve, 200));

  await postTransaction(tx);
};

main();
