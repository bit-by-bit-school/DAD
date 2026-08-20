'use strict';

process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', function(inputStdin) {
    inputString += inputStdin;
});

process.stdin.on('end', function() {
    inputString = inputString.split('\n');

    main();
});

function readLine() {
    return inputString[currentLine++];
}

/*
 * Complete the 'kaprekarNumbers' function below.
 *
 * The function accepts following parameters:
 *  1. INTEGER p
 *  2. INTEGER q
 */

function kaprekarNumbers(p, q) {
    // Write your code here
    let result = [];

    for (let i = p; i <= q; i++) {
        let square = (i * i).toString();
        let d = i.toString().length;
        let right = square.slice(-d);
        let left = square.slice(0, square.length - d) || '0';

        if (parseInt(left) + parseInt(right) === i) {
            result.push(i);
        }
    }

    console.log(result.length ? result.join(' ') : 'INVALID RANGE');
}

function main() {
    const p = parseInt(readLine().trim(), 10);

    const q = parseInt(readLine().trim(), 10);

    kaprekarNumbers(p, q);
}
