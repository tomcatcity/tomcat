import { Component, OnInit } from '@angular/core';
import BigNumber from 'bignumber.js';
import { ConstantsService } from '../constants.service';
import { ContractService } from '../contract.service';
import { UtilsService } from '../utils.service';
import { WalletService } from '../wallet.service';

@Component({
  selector: 'app-summon',
  templateUrl: './summon.component.html',
  styleUrls: ['./summon.component.css']
})
export class SummonComponent implements OnInit {

  constructor(public wallet: WalletService, public contract: ContractService, public constants: ConstantsService, public utils: UtilsService) { 
    this.resetData();
  }

  stakeAmount: string;
  stakedXmon: BigNumber;
  maxStakeAmount: BigNumber;
  xmonBalance: BigNumber;
  doomBalance: BigNumber;
  doomFee: BigNumber;
  blockNumber: any;
  unlockBlock: BigNumber;
  baseDelay: BigNumber;
  currentDelay: BigNumber;
  maxDelay: BigNumber;
  resetFee: BigNumber;
  numMons: BigNumber;
  maxMons: BigNumber;

  ngOnInit(): void {
    if (this.wallet.connected) {
      this.loadData();
    }
    this.wallet.connectedEvent.subscribe(() => {
      this.loadData();
    });
    this.wallet.errorEvent.subscribe(() => {
      this.resetData();
    });
  }

  resetData() {
    this.stakedXmon = new BigNumber(0);
    this.maxStakeAmount = new BigNumber(0);
    this.xmonBalance = new BigNumber(0);
    this.doomBalance = new BigNumber(0);
    this.doomFee = new BigNumber(0);
    this.unlockBlock = new BigNumber(0);
    this.baseDelay = new BigNumber(0);
    this.currentDelay = new BigNumber(0);
    this.resetFee = new BigNumber(0);
    this.maxDelay = new BigNumber(0);
    this.numMons = new BigNumber(0);
    this.maxMons = new BigNumber(0);
  }

  async loadData() {

    const multicallFns = {
      "xmonBalance": {
        target: this.constants.XMON_ADDRESS,
        callData: this.contract.XMON.methods.balanceOf(this.wallet.userAddress).encodeABI()
      },
      "maxStakeAmount": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.maxStake().encodeABI()
      },
      "doomFee": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.doomFee().encodeABI()
      },
      "doomBalance": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.doomBalances(this.wallet.userAddress).encodeABI()
      },
      "pendingDoomBalance": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.pendingDoom(this.wallet.userAddress).encodeABI()
      },
      "unlockBlock": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.nextSummonTime(this.wallet.userAddress).encodeABI()
      },
      "baseDelay": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.startDelay().encodeABI()
      },
      "currentDelay": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.summonDelay(this.wallet.userAddress).encodeABI()
      },
      "resetFee": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.resetFee().encodeABI()
      },
      "stakeRecords": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.stakeRecords(this.wallet.userAddress).encodeABI()
      },
      "maxDelay": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.maxDelay().encodeABI()
      },
      "numMons": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.numMons().encodeABI()
      },
      "maxMons": {
        target: this.constants.MON_STAKER_ADDRESS,
        callData: this.contract.MON_STAKER.methods.maxMons().encodeABI()
      }
    };

    const multicallKeys = Object.keys(multicallFns);
    const multicallValues = Object.values(multicallFns);
    let rawResult = await this.contract.MULTICALL.methods.aggregate(multicallValues).call();
    let multicallResults = this.utils.zipObject(multicallKeys, rawResult["returnData"]);

    this.blockNumber = rawResult["blockNumber"];
    this.xmonBalance = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["xmonBalance"])).div(this.constants.PRECISION);
    this.maxStakeAmount = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["maxStakeAmount"])).div(this.constants.PRECISION);

    this.doomFee = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["doomFee"])).div(this.constants.DOOM_SCALING);
    let currDoomBalance = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["doomBalance"]))
    let pendingDoomBalance = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["pendingDoomBalance"]));
    this.doomBalance = currDoomBalance.plus(pendingDoomBalance).div(this.constants.DOOM_SCALING);

    this.unlockBlock = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["unlockBlock"]));
    this.baseDelay = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["baseDelay"]));
    this.resetFee = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["resetFee"])).div(this.constants.PRECISION);
    this.currentDelay = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["currentDelay"]));
    this.maxDelay = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["maxDelay"]));
    this.stakedXmon = new BigNumber(this.wallet.web3.eth.abi.decodeParameter({
      "stakeRecord": {
        "amount": "uint256",
        "startBlock": "uint256"
      }
    }, multicallResults["stakeRecords"])["amount"]).div(this.constants.PRECISION);
    this.numMons = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["numMons"]));
    this.maxMons = new BigNumber(this.wallet.web3.eth.abi.decodeParameter('uint256', multicallResults["maxMons"]));
  }

  stake() {
    if (!this.stakeAmount) {
      this.stakeAmount = '0';
    }
    if (this.stakeAmount === '0') {
      alert("Must have stake greater than 0!");
      return;
    }
    const formattedStakeAmount = new BigNumber(this.stakeAmount).times(this.constants.PRECISION).integerValue().toFixed();
    const maxStake = this.maxStakeAmount.times(this.constants.PRECISION).integerValue().toFixed();

    if (this.stakedXmon.plus(formattedStakeAmount).gt(maxStake)) {
      alert("Staking more than max stake!");
      return;
    }

    const func = this.contract.MON_STAKER.methods.addStake(formattedStakeAmount);
    this.wallet.sendTxWithToken(func, this.contract.XMON, this.constants.MON_STAKER_ADDRESS, formattedStakeAmount,
      200000, () => { }, () => {
        this.loadData();
      }, () => { });
  }

  removeStake() {
    const func = this.contract.MON_STAKER.methods.removeStake();
    this.wallet.sendTx(func, () => { }, () => {
      this.loadData();
    }, () => { });
  }

  claimDoom() {
    const func = this.contract.MON_STAKER.methods.awardDoom(this.wallet.userAddress);
    this.wallet.sendTx(func, () => { }, () => {
      this.loadData();
    }, () => { });
  }

  claimMon() {
    const func = this.contract.MON_STAKER.methods.claimMon();
    this.wallet.sendTx(func, () => { }, () => {
      this.loadData();
    }, () => { });
  }

  resetDelay() {
    const func = this.contract.MON_STAKER.methods.resetDelay();
    this.wallet.sendTx(func, () => { }, () => {
      this.loadData();
    }, () => { });
  }

  getDoomPerHour() {
    let doomPerHour = this.stakedXmon.times(new BigNumber(9)).div(new BigNumber(2)).times(new BigNumber(60)).times(this.constants.PRECISION).div(this.constants.DOOM_SCALING);
    return doomPerHour;
  }

  summonAvailable() {
    return this.unlockBlock.lt(this.blockNumber);
  }
}
