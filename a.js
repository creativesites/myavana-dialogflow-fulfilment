let a = `line1
line2
line3
line4
line5
line6
line7
line8
line9`
const getLineCount = (text) => {
    if (!text) {
        return 0;
    }
    
    return text.split(/\n/).length;
}

let b = getLineCount(a)
if(b >= 7){
    let firstNewLineIndex = a.indexOf("\n");
    let secondNewLineIndex = a.indexOf("\n", firstNewLineIndex + 4);
    let newString = a.slice(0, firstNewLineIndex) + a.slice(secondNewLineIndex);
    console.log(newString);
}
function checkLines(str) {
    let lines = str.split('\n');
    if (lines.length >= 7) {
      let firstLine = lines[0];
      let lastFourLines = lines.slice(lines.length - 4).join('\n');
      return firstLine + '\n' + lastFourLines;
    }
    return str;
}
let result = checkLines(a);
console.log(result);