import Blowfish from 'egoroof-blowfish';

export class CryptoHelper {
  private static CRYPT_KEY = new Uint8Array(
    Buffer.from("-'U3r7rX0GMYjEuBg+n~n4bw|joE}Dt+h+5Ae]#@*j-~_YlI5)^YDJLG77n0")
  );
  private static MAGIC_VALUE = 'WMCR';
  private static KEYSIZE_CRYPT = 128;
  private static FIRST_HEADER_VERSION = 1;

  static test() {
    const data = this.sdecrypt(
      new Uint8Array(
        Buffer.from(
          '574d43520100584dc4bfee2adf09dd30641271af10dfc7ae5d889bceed575628d5a1d3e956d2a492da035e2e43510a995409118c3b104d57320466f7c7b391715d5a660cc936e2f86867b3e5025b96d20044832631e2094664ffcab28d91e011bdbde3f10718d687d33560b9ecb919'
        )
      ),
      'xyzzy'
    );
    console.log(data);
  }

  static sdecrypt(data: Uint8Array, seed: string): string {
    return Buffer.from(this.decrypt(data, seed)).toString();
  }

  static decrypt(data: Uint8Array, seed: string): Uint8Array {
    // File is: MAGIC VERSION HEADERSIZE*2 HEADER DATA
    // First header
    const magic = Buffer.from(data.slice(0, this.MAGIC_VALUE.length)).toString();
    if (magic !== this.MAGIC_VALUE) {
      throw new Error('Bad Magic value: ' + magic);
    }
    if (data[0] !== this.FIRST_HEADER_VERSION) {
      throw new Error('Unhandled encryption version: ' + data[0]);
    }
    const headerSize = data[1] * 256 + data[2];
    data.slice(0, 3);
    // Second header
    const params = this.getDecryptionHelper(data, seed);
    if (params.algo !== 'Blowfish/CBC/PKCS5Padding') {
      throw new Error('Unknown encryption algorithm: ' + params.algo);
    }
    const algo = new Blowfish(params.key, Blowfish.MODE.CBC, Blowfish.PADDING.PKCS5);
    return algo.decode(data);
  }

  private static getKeyFromSeed(seed: string): Uint8Array {
    const bseed = new Uint8Array(Buffer.from(seed));
    const key = new Uint8Array();
    const loops = this.KEYSIZE_CRYPT / 8 / bseed.length;
    const lastLoop = (this.KEYSIZE_CRYPT / 8) % bseed.length;
    // Loop over the seed and add the default key to it
    for (let i = 0; i < loops; i++) {
      for (let j = 0; j < bseed.length; j++) {
        const k = i * bseed.length + j;
        key[k] = bseed[j] ^ this.CRYPT_KEY[k];
      }
    }
    // Last loop
    for (let j = 0; j < lastLoop; j++) {
      const k = loops * bseed.length + j;
      key[k] = bseed[j] ^ this.CRYPT_KEY[k];
    }
    return key;
  }

  private static getHeaderCipher(key: Uint8Array): Blowfish {
    return new Blowfish(key, Blowfish.MODE.CBC, Blowfish.PADDING.PKCS5);
  }

  /**
   * Gets the params, "cuts" tyhem from the input data, so the given data only contains the encryption data at the end
   **/
  private static getDecryptionHelper(data: Uint8Array, seed: string): CryptParameters {
    // Header is encrypted
    // Decrypt the header
    const key0 = CryptoHelper.getKeyFromSeed(seed);
    const ci0 = CryptoHelper.getHeaderCipher(key0);
    const header = ci0.decode(data);
    const alogo0Length = header[0];
    const alogoLength = header[1];
    const keyLength = header[2];
    const ivLength = header[3];
    const nameLength = header[4];
    const hashNameLength = header[5];
    const hashLength = header[6];
    header.slice(0, 7);
    // Extract the decryption info
    const params = new CryptParameters();
    // Size
    params.size =
      header[0] * 256 +
      header[1] * 256 +
      header[2] * 256 +
      header[3] * 256 +
      header[4] * 256 +
      header[5] * 256 +
      header[6] * 256 +
      header[7] * 256;
    header.slice(0, 7);
    // Type
    const part = header.slice(0, 4);
    params.type = part[0] !== 0 ? Buffer.from(part).toString() : '';
    // Algo
    header.slice(0, alogo0Length);
    params.algo = Buffer.from(header.slice(0, alogoLength)).toString();
    // Key
    params.key = header.slice(0, keyLength);
    // IV
    params.ivs = header.slice(0, ivLength);
    // Name
    params.name = Buffer.from(header.slice(0, nameLength)).toString();
    // Hash
    if (hashNameLength > 0) {
      params.hashAlgo = Buffer.from(header.slice(0, hashNameLength)).toString();
      params.hash = header.slice(0, hashLength);
    }
    return params;
  }
}

class CryptParameters {
  /** Total size of the data, 64 bits */
  size!: number;
  type!: string;
  algo!: string;
  name!: string;
  hashAlgo?: string;
  hash?: Uint8Array;
  key!: Uint8Array;
  ivs!: Uint8Array;
}
