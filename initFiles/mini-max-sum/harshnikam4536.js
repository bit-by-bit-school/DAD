"use strict";

process.stdin.resume();
process.stdin.setEncoding("utf-8");

let inputString = "";
let currentLine = 0;

process.stdin.on("data", function (inputStdin) {
  inputString += inputStdin;
});

process.stdin.on("end", function () {
  inputString = inputString.split("\n");

  main();
});

function readLine() {
  return inputString[currentLine++];
}

/*
 * Complete the 'miniMaxSum' function below.
 *
 * The function accepts INTEGER_ARRAY arr as parameter.
 */

function miniMaxSum(arr) {
  // Write your code here
  let totalSum = 0;
  let maxNum = 0;
  let minNum = 0;

  arr.sort();

  for (let num of arr) {
    totalSum += num;
    // if (num > maxNum) {
    //     maxNum = num;
    // }
    // if(num < minNum){
    //     minNum = num;
    // }
  }
  minNum = totalSum - arr[4];
  maxNum = totalSum - arr[0];
  // let maxSum = totalSum - maxNum;
  // let minSum = totalSum - minNum;

  console.log(minNum, maxNum);
}

function main() {
  const arr = readLine()
    .replace(/\s+$/g, "")
    .split(" ")
    .map((arrTemp) => parseInt(arrTemp, 10));

  miniMaxSum(arr);
}
