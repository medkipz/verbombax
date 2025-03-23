//const { systemPreferences } = import("electron")

//const fs = import('node:fs');

import * as fs from 'fs';

const LastNumber = 1108
const BaseURLHalf1 = "https://www.perseus.tufts.edu/hopper/vocablist?works=Perseus%3Atext%3A2011.01."
const BaseURLHalf2 = "&sort=weighted_freq&filt=100&filt_custom=&output=xml&lang=la"

const Regex = /<headword>(.*?)<\/headword>/g;

let Match
let Result = ""
let WordList = []
let FormatText = ""

for (let i = LastNumber; i > 0; i--) {
	let ExtraZeroes = ""

	if (i < 1000) {
		ExtraZeroes += 0
	} 

	if (i < 100) {
		ExtraZeroes += 0
	} 

	if (i < 10) {
		ExtraZeroes += 0
	} 

	let response = await fetch(BaseURLHalf1 + ExtraZeroes + i + BaseURLHalf2)
	let ExtractedText = await response.text()

	while ((Match = Regex.exec(ExtractedText)) != null) {
		Match[1] = Match[1].toLowerCase()
		WordList.push(Match[1])
	} 

	console.log(i)
}
let temp = WordList
WordList = [...new Set(temp)]

WordList.forEach(element => {
	FormatText += element + "\n"
})

console.log("WORD EXTRACTION COMPLETE!")

fs.writeFileSync('/Users/johnm/Downloads/test.txt', FormatText);