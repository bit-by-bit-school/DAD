'use strict';

const fs = require('fs');

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
 * Complete the 'timeConversion' function below.
 *
 * The function is expected to return a STRING.
 * The function accepts STRING s as parameter.
 */

function timeConversion(s) {
    let amPm = s.charAt(8); // Extract AM/PM indicator
    let hour = s.substring(0, 2); // Extract hour part
    let militaryHour;

    if (amPm === 'A') {
        // Handle AM case
        militaryHour = (hour === '12') ? '00' : hour;
    } else {
        // Handle PM case
        militaryHour = (hour === '12') ? hour : String(parseInt(hour, 10) + 12);
    }

    // Combine military hour with the rest of the time
    return militaryHour + s.substring(2, 8);
}


function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const s = readLine();

    const result = timeConversion(s);

    ws.write(result + '\n');

    ws.end();
}
