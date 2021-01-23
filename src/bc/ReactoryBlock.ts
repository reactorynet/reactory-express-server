import crypto from 'crypto';
import elliptic from 'elliptic';

const ec = new elliptic.ec("secp256k1");

class Transaction {
    fromAddress: string
    toAddress: string
    amount: number
    signature: string;

    constructor(fromAddress: string, toAddress: string, amount: number) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
    };

    calculateHash() {
        const hashProvider = crypto.createHash('sha256', { encoding: 'utf-8' });
        let input = `${this.fromAddress}${this.toAddress}${this.amount}`;
        return hashProvider.update(input).digest('hex');
    }

    signTransaction(signingKey: any) {

        if(signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('Cannot sign transactions for other wallets');
        }

        const hash = this.calculateHash();
        const sign = signingKey.sign(hash, 'base64');
        this.signature = sign.toDER('hex');
    }



    isValid() {
        if(this.fromAddress === null) return true;

        if(this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }

        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
    
}


class ReactoryBlock {
    timestamp: number;
    transactions: Transaction[];
    previousHash: string;
    hash: string;
    nonce: number = 0;
    constructor(timestamp: any, data: any, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = data;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();

    }

    calculateHash() {
        const hashProvider = crypto.createHash('sha256', { encoding: 'utf-8' });
        let input = `${this.previousHash}${this.timestamp}${JSON.stringify(this.transactions)}`;
        return hashProvider.update(input).digest('hex');        
    }

    mineBlock(difficulty: number) {
        while(this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")){
            this.nonce++;
            this.hash = this.calculateHash();
        }
    }

    hasValidTransactions() {
        for(const tx of this.transactions) {
            if(!tx.isValid()) return false;
        }

        return true;
    }
}

class ReactoryBlockChain {
    chain: ReactoryBlock[];
    difficulty: number = 2;
    pendingTransactions: any[] = [];
    miningReward: number = 1
    constructor(){
        this.chain = [this.getGenesis()];
        this.difficulty = 2;
    }

    getGenesis(){
        return new ReactoryBlock(0, new Date().valueOf(), {});
    }

    getLatestBlock(){
        return this.chain[this.chain.length - 1];
    }

    addBlock(block: ReactoryBlock){
        block.previousHash = this.getLatestBlock().hash;
        block.hash = block.calculateHash();
        this.chain.push(block);
    }

    minePendingTransactions(rewardAddress: string) {
        let block = new ReactoryBlock(Date.now().valueOf(), this.pendingTransactions);
        block.mineBlock(this.difficulty);
        this.chain.push(block);
        this.pendingTransactions = [
            new Transaction(null, rewardAddress, this.miningReward)
        ];
    }

    createTransaction(transaction: Transaction) {
        if(!transaction.fromAddress || !transaction.toAddress) throw new Error('Tansaction Requires to and from address')

        if(transaction.isValid()) {
            this.pendingTransactions.push(transaction);
        }
    }

    getBalanceOfAddress(address: string){
        let balance = 0;

        for(const block of this.chain) {
            for(const trans of block.transactions) {
                if(trans.toAddress === address) {
                    balance += trans.amount;
                }
    
                if(trans.fromAddress === address) {
                    balance -= trans.amount;
                }
            }            
        }

        return balance;
    }

    

    isChainValid() {
        for(let index = 1; this.chain.length; index++) {
            let current = this.chain[index];
            let previous = this.chain[index - 1];

            if(current.hasValidTransactions() === false) return false;
            if(current.hash !== current.calculateHash()) return false;
            if(current.previousHash !== previous.hash) return false;
        }

        return true;
    }
}

