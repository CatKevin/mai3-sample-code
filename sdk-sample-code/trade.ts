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
} from "../utils/utils"

async function main() {
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

  // 1. use queryTrade() to know totalFee, cost before executing trade().
  let { tradePrice, totalFee, cost } = await liquidityPool.connect(signer).callStatic.queryTrade(0, signer.address, toWei("1"), NONE, USE_TARGET_LEVERAGE)
  console.log("tradePrice " + fromWei(tradePrice.toString()))
  console.log("totalFee " + fromWei(totalFee.toString()))
  console.log("cost " + fromWei(cost.toString()) + " ~= (mark price / leverage) + Keeper Gas Reward")

  // 2. execute trade(): open position
  await ensureFinished(liquidityPool.connect(signer).trade(0, signer.address, toWei("1"), toWei("4500"), Math.floor(Date.now()/1000)+999999, NONE, USE_TARGET_LEVERAGE))
  console.log("open position")

  // 3. execute trade(): close position
  await ensureFinished(liquidityPool.connect(signer).trade(0, signer.address, toWei("-1"), toWei("3000"), Math.floor(Date.now()/1000)+999999, NONE, USE_TARGET_LEVERAGE))
  console.log("close position")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })