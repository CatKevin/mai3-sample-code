import { JsonRpcProvider } from "@ethersproject/providers";
import { LiquidityPoolFactory } from '@mcdex/mai3.js';
import { ethers } from 'ethers';
import * as dotenv from "dotenv";
dotenv.config({ path: '~/.env' });

import {
  toWei,
  fromWei,
  NONE,
  USE_TARGET_LEVERAGE,
  ensureFinished,
} from "./utils"

async function positionMain(liquidityPool: any, signer: any) {
  // 1. use queryTrade() to know totalFee, cost before executing trade().
  // POSITION = 1
  let { totalFee, cost } = await liquidityPool.connect(signer).callStatic.queryTrade(0, signer.address, toWei("1"), NONE, USE_TARGET_LEVERAGE)
  console.log("totalFee", fromWei(totalFee.toString()))
  console.log("cost " + fromWei(cost.toString()) + " ~= (mark price / leverage) + Keeper Gas Reward")

  // 2. execute trade(): open position
  await ensureFinished(liquidityPool.connect(signer).trade(0, signer.address, toWei("1"), toWei("4000"), Math.floor(Date.now()/1000)+999999, NONE, USE_TARGET_LEVERAGE))
  console.log("open position")

  // 3. execute trade(): close position
  await ensureFinished(liquidityPool.connect(signer).trade(0, signer.address, toWei("-1"), toWei("3500"), Math.floor(Date.now()/1000)+999999, NONE, USE_TARGET_LEVERAGE))
  console.log("close position")
}

async function collateralMain(liquidityPool: any, signer: any) {
  // 1. Using collateral to calculate position.
  const {nums} = await liquidityPool.getPerpetualInfo(0)
  const markPrice = fromWei(nums[1].toString())
  // Take 3500 USDC for example: long 3500 USDC
  const position = 3500 / Number(markPrice)
  console.log("markPrice " + markPrice, "position " + position + " = 3500 / markPrice")

  // 2. execute trade(): open position
  await ensureFinished(liquidityPool.connect(signer).trade(0, signer.address, toWei(position.toString()), toWei("4000"), Math.floor(Date.now()/1000)+999999, NONE, USE_TARGET_LEVERAGE))
  console.log("open position")

  // 3. execute trade(): close position
  const negPosition = position*-1
  await ensureFinished(liquidityPool.connect(signer).trade(0, signer.address, toWei(negPosition.toString()), toWei("3000"), Math.floor(Date.now()/1000)+999999, NONE, USE_TARGET_LEVERAGE))
  console.log("close position")
}

async function main() {
  // 1. Get contract ABI, LiquidityPoolAddress
  const liquidityPoolAddress = "0xc32a2dfee97e2babc90a2b5e6aef41e789ef2e13"
  const provider = new JsonRpcProvider('https://rinkeby.arbitrum.io/rpc')
  const pk = process.env.PRIVATE_KEY
  if (pk == undefined) {
    console.log("PRIVATE_KEY is undefined")
    return
  }
  // @ts-ignore
  const signer = new ethers.Wallet(pk, provider)
  // @ts-ignore
  const liquidityPool = LiquidityPoolFactory.connect(liquidityPoolAddress, provider)

  // 2. setTargetLeverage if leverage is not 5.
  let marginAccount = await liquidityPool.getMarginAccount(0, signer.address)
  let targetLeverage = fromWei(marginAccount.targetLeverage.toString())
  if (targetLeverage != '5.0') {
    await ensureFinished(liquidityPool.connect(signer).setTargetLeverage(0, signer.address, toWei("5")))
    console.log("Set leverage to 5");
  }

  // Take Arb-Rinkeby LiquidityPool (0xc32a2dfee97e2babc90a2b5e6aef41e789ef2e13) for example.
  // take perpetualIndex 0 (ETH-USD) for example:
  await positionMain(liquidityPool, signer)
  await collateralMain(liquidityPool, signer)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
