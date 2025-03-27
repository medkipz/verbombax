import wordlist from "./words.js"
import pokelist from "./pokemon.js"

let wordLists = {
	"standard" : wordlist,
	"pokemon" : pokelist
}

let requiredLists = {
	"standard" : ["ab", "ac", "ad", "ae", "ag", "am", "au", "bi", "ci", "ce", "co", "cr", "de", "di", "ea", "eg", "es", "et", "fa", "fu", "ic", "im", "in", "la", "le", "ma", "mi", "me", "ne", "no", "pe", "qu", "re", "se", "ta", "te", "un", "v"],
	"allLatinLetters" : ["a", "b", "c", "d", "e", "f", "g", "h", "i", "l", "m", "n", "o", "p", "q", "r", "s", "t", "v"],
	"allLetters" : ["a", "b", "c", "d", "e", "f", "g", "h", "i", "l", "m", "n", "o", "p", "r", "s", "t", "v", "x", "y", "z"],
}

let timer = null
let animationStartTime = null

// data persistence
let highScore = localStorage.getItem("High Score") || 0
Array.from(document.getElementsByClassName("highscoredisplay")).forEach(element => {
	element.textContent = highScore
})

// settings variables
let isSoundEnabled = true

// game variables
let usedWords = []
let timeLimitMs = 0
let currentScore = 0
let currentLives = 0
let currentRequired = ""
let scoringEnabled = false

// gameplay settings variables
let maxTimeLimitMs = 8000
let maxLives = 2
let currentRequiredList = "standard"
let currentWordList = "standard"

// a modified xorshift alogorithm (https://en.wikipedia.org/wiki/xorshift)
// in testing, the numbers it generates are roughly evenly distributed, though its probably not statistically perfect
let rng = {
	seed : Math.floor(Date.now()),

	setSeed : function(gotSeed) {
		gotSeed = gotSeed.toString()
		let tempSeed = ""

		for (let i = 0; i < gotSeed.length; i++) {
			tempSeed += gotSeed.charCodeAt(i)
		}

		this.seed = parseInt(tempSeed) >>> 0
	},

	nextInt : function(min, max) {
		let result = this.seed
		this.seed++

		result ^= result << 13
		result ^= result >> 17
		result ^= result << 5
		// pad out rng with e and limit it to a 0-1 range
		result = Math.abs((result * Math.E) % 1)
		return (min || min == 0) && max ? Math.floor(result * (max + 1 - min) + min) : result
	},
}

if (!localStorage.getItem("HasViewedTutorial")) {
	// TODO display tutorial
}

function showAlert(message, timeMs) {
	const alertContainer = document.getElementById('alertContainer')
	const alertBox = document.createElement('div')
	alertBox.className = 'alert-box'
	alertBox.innerHTML = message

	alertContainer.appendChild(alertBox)

	setTimeout(() => {
		alertBox.classList.add('fade-out')
		setTimeout(() => {
			alertContainer.removeChild(alertBox)
		}, 500)
	}, timeMs)
}

function playSound(audio) {
	if (isSoundEnabled) {
		audio.play()
	}
}

function animateCircle(timeMs) {
	let circle = document.getElementById("circle")
	let quickAnimationMs = 250

	circle.style.animation = "pulse infinite " + timeMs / 12 + "ms"
	circle.offsetHeight

	if (animationStartTime) {
		let animationOffset = Date.now() - animationStartTime
		let rotation = animationOffset / timeMs * 360
		circle.style.setProperty("--startRotation", rotation + "deg")

		circle.style.animation = "spin " + quickAnimationMs + "ms, pulse infinite " + timeMs / 12 + "ms"
		setTimeout(() => {
			circle.style.animation = "pulse pulse infinite " + timeMs / 12 + "ms"
			circle.offsetHeight
			animationStartTime = Date.now()
			circle.style.setProperty("--startRotation", 0 + "deg")
			circle.style.animation = "spin linear " + (timeMs - quickAnimationMs) + "ms, pulse infinite " + timeMs / 12 + "ms"
		}, quickAnimationMs)
	} else {
		circle.offsetHeight
		animationStartTime = Date.now()
		circle.style.animation = "spin linear " + timeMs + "ms, pulse infinite " + timeMs / 12 + "ms"
	}
}

function displayCharacters(characters, required) {
	let chardisplay = document.getElementById("chardisplay")
	let indextohighlight
	let characterstohighlight
	let numberofcharactershighlighted = 0

	characters = characters.toLowerCase()

	while (chardisplay.firstChild) {
		chardisplay.removeChild(chardisplay.firstChild)
	}

	for (let i = required.length; i > 0; i--) {
		let substring = required.substring(0, i)
		if (characters.lastIndexOf(substring) != -1 && (substring == required || characters.lastIndexOf(substring) == characters.length - substring.length)) {
			indextohighlight = characters.lastIndexOf(substring)
			characterstohighlight = i
			break
		}
	}
	
	if (characters != []) {
		let newcharblock

		for (let i = 0; i < characters.length; i++) {
			let character = characters[i]
			newcharblock = document.createElement("div")
			newcharblock.textContent = character

			if (i == indextohighlight && characterstohighlight > 0) {
				indextohighlight++
				characterstohighlight--
				newcharblock.className = "highlightedcharblock"
				numberofcharactershighlighted++
			} else {
				newcharblock.className = "charblock"
			}

			document.getElementById("chardisplay").appendChild(newcharblock)
		}
		//animates final charblock
		newcharblock.style.animation = "wobble 0.15s"
	}

	for (let i = 0 + numberofcharactershighlighted; i < required.length; i++) {
		let character = required[i]
		let newcharblock = document.createElement("div")
		newcharblock.className = "requiredcharblock"
		newcharblock.textContent = character
		document.getElementById("chardisplay").appendChild(newcharblock)
	}
}

function setScore(toValue) {
	currentScore = toValue
	Array.from(document.getElementsByClassName("scoredisplay")).forEach(element => {
		element.textContent = currentScore
	})
	if (scoringEnabled && currentScore > highScore) {
		highScore = currentScore
		localStorage.setItem("High Score", highScore)
		Array.from(document.getElementsByClassName("highscoredisplay")).forEach(element => {
			element.textContent = "High Score: " + highScore
		})
	}
}

function failedWord() {
	playSound(new Audio('/sounds/fail.wav'))

	currentLives--

	document.getElementById("failvignette").style.opacity = 1
	setTimeout(() => {
		document.getElementById("failvignette").style.opacity = 0
	}, 300)

	document.getElementById("hpdisplay").textContent = ""
	document.getElementById("hpdisplay").style.animation = null
	document.getElementById("hpdisplay").offsetHeight
	document.getElementById("hpdisplay").style.animation = "shake 0.15s"
	
	for (let i = 0; i < currentLives; i++) {
		document.getElementById("hpdisplay").textContent += "💖"
	}
	for (let i = 0; i < maxLives - currentLives; i++) {
		document.getElementById("hpdisplay").textContent += "💔"
	}
 
	if (currentLives <= 0) { // game over
		animationStartTime = null
		usedWords = []
		rng.setSeed(document.getElementById("seedInput").value ? document.getElementById("seedInput").value : Date.now())
		document.getElementById("gameinput").value = ""
		document.getElementById("results").style.display = "block"
		document.getElementById("results").offsetHeight
		document.getElementById("results").style.opacity = 1
		displayCharacters("", "")
	} else {
		document.getElementById("gameinput").value = ""
		currentRequired = requiredLists[currentRequiredList][rng.nextInt(0, requiredLists[currentRequiredList].length - 1)] 
		displayCharacters(document.getElementById("gameinput").value, currentRequired)
		clearTimeout(timer)
		timer = setTimeout(failedWord, timeLimitMs)
		animateCircle(timeLimitMs)
	}
}

// MAIN CODE
function runGame() {
	setScore(0)
	scoringEnabled = maxTimeLimitMs == 8000 && maxLives == 2 && currentRequiredList == "standard" && currentWordList == "standard"

	document.getElementById("chardisplay").style.animation = null
	document.getElementById("chardisplay").offsetHeight
	document.getElementById("mainMenu").style.display = "none"
	document.getElementById("game").style.display = "flex"

	currentRequired = requiredLists[currentRequiredList][rng.nextInt(0, requiredLists[currentRequiredList].length - 1)] 
	displayCharacters(document.getElementById("gameinput").value, currentRequired)

	timeLimitMs = maxTimeLimitMs + 2000
	currentLives = maxLives

	document.getElementById("hpdisplay").textContent = ""
	document.getElementById("hpdisplay").style.animation = null
	
	for (let i = 0; i < currentLives; i++) {
		document.getElementById("hpdisplay").textContent += "💖"
	}

	timer = setTimeout(failedWord, timeLimitMs)
	document.getElementById("gameinput").focus()

	animateCircle(timeLimitMs)
}

document.getElementById("playButton").addEventListener("click", runGame)

document.getElementById("gameinput").addEventListener("keypress", input => {
	if (currentLives <= 0) {
		console.log("test")
		return
	}

	if (input.key == "Enter") {
		if (wordLists[currentWordList][document.getElementById("gameinput").value.toLowerCase()] && !usedWords[document.getElementById("gameinput").value.toLowerCase()] && document.getElementById("gameinput").value.indexOf(currentRequired) != -1 ) {
			usedWords[document.getElementById("gameinput").value.toLowerCase()] = true
			setScore(currentScore + 1)
			timeLimitMs = (Math.E ** (-currentScore / 50)) * maxTimeLimitMs + 2000

			document.getElementById("gameinput").value = ""
			currentRequired = requiredLists[currentRequiredList][rng.nextInt(0, requiredLists[currentRequiredList].length - 1)] 
			displayCharacters(document.getElementById("gameinput").value, currentRequired)
			clearTimeout(timer)
			timer = setTimeout(failedWord, timeLimitMs)
			animateCircle(timeLimitMs)
		} else {
			document.getElementById("chardisplay").style.animation = null
			document.getElementById("chardisplay").offsetHeight
			document.getElementById("chardisplay").style.animation = "shake 0.15s"

			playSound(new Audio('/sounds/incorrect.wav'))

			if (document.getElementById("gameinput").value.toLowerCase().indexOf(currentRequired) == -1) {
				showAlert("That word does not contain the prompt", 750)
			} else if (usedWords[document.getElementById("gameinput").value.toLowerCase()]) {
				showAlert("You've already used that word", 750)
			} else if (!wordLists[currentWordList][document.getElementById("gameinput").value.toLowerCase()]) {
				showAlert("That word does not exist", 750)
			}
		}
	} else {
		// Might be bad code... But the text box is updated after this event is fired, so we need to wait a millisecend to get the updated value
		setTimeout(() =>  {
			let audio = new Audio('/sounds/cowbell.wav')
			audio.volume = 0.35
			audio.playbackRate = Math.min(0.5 * document.getElementById("gameinput").value.length / 10 + .75, 1.5)
			audio.preservesPitch = false
			playSound(audio)
		}, 1)
	}
})

document.getElementById("settingsButton").addEventListener("click", () => {
	if (document.getElementById("settings").style.display == "none") {
		document.getElementById("settings").style.display = "flex"
	} else {
		document.getElementById("settings").style.display = "none"
	}
})

let flip = true
document.getElementById("gameplaySettingsButton").addEventListener("click", () => {
	if (flip) {
		document.getElementById("gameplaySettings").style.animation = "slideOpen 0.3s"
		document.getElementById("gameplaySettings").style.height = "20vh"
		document.getElementById("gameplaySettingsButton").textContent = "Gameplay Settings v"
	} else {
		document.getElementById("gameplaySettings").style.animation = "slideClose 0.2s"
		document.getElementById("gameplaySettings").style.height = "0vh"
		document.getElementById("gameplaySettingsButton").textContent = "Gameplay Settings >"
	}

	flip = !flip
})

document.getElementById("gameinput").addEventListener("input", () => {
	if (currentLives > 0) {
		displayCharacters(document.getElementById("gameinput").value, currentRequired)
	}
})

document.getElementById("soundEnableCheckbox").addEventListener("change", () => {
	isSoundEnabled = document.getElementById("soundEnableCheckbox").checked
})

document.getElementById("bulletModeCheckbox").addEventListener("change", () => {
	if (document.getElementById("bulletModeCheckbox").checked) {
		maxTimeLimitMs = 1000
		currentRequiredList = "bullet"
	} else {
		maxTimeLimitMs = 8000
		currentRequiredList = "standard"
	}
})

document.getElementById("seedInput").addEventListener("input", () => {
	if (document.getElementById("seedInput").value == "") {
		rng.setSeed(Date.now())
	} else {
		rng.setSeed(document.getElementById("seedInput").value)
	}
})

document.getElementById("timeLimitInput").addEventListener("input", () => {
	if (!parseInt(document.getElementById("timeLimitInput").value) || document.getElementById("timeLimitInput").value == "" || document.getElementById("timeLimitInput").value * 1000 < 2000) {
		maxTimeLimitMs = 8000
	} else {
		maxTimeLimitMs = document.getElementById("timeLimitInput").value * 1000 - 2000
	}
})

document.getElementById("maxLivesInput").addEventListener("input", () => {
	if (!parseInt(document.getElementById("maxLivesInput").value) || document.getElementById("maxLivesInput").value == "" || document.getElementById("maxLivesInput").value < 1) {
		maxLives = 2
	} else {
		maxLives = Math.min(document.getElementById("maxLivesInput").value, 10000)
	}
})

document.getElementById("gamemodeselect").addEventListener("change", () => {
	let gameMode = document.getElementById("gamemodeselect").value

	if (gameMode == "standard") {
		currentWordList = "standard"
		currentRequiredList = "standard"
		maxTimeLimitMs = 8000
	} else if (gameMode == "bullet") {
		currentWordList = "standard"
		currentRequiredList = "allLatinLetters"
		maxTimeLimitMs = 1000
	} else if (gameMode == "pokemon") {
		currentWordList = "pokemon"
		currentRequiredList = "allLetters"
		maxTimeLimitMs = 8000
	} 
})

{
	let flip = true;
	document.getElementById("circle").addEventListener("animationiteration", data => {
		if (data.animationName == "pulse" && currentLives > 0) {
			let audio = new Audio('/sounds/tick.wav')
			audio.volume = 0.25
			audio.preservesPitch = false
			// eslint-disable-next-line
			audio.playbackRate = (flip = !flip) ? 2 : 1.5	
			playSound(audio)
		}
	})
}
{
	let debounce = false

	document.getElementById("resultsplayagainbutton").addEventListener("click", () => {
		if (!debounce) {
			debounce = true

			document.getElementById("results").style.opacity = 0
			
			setTimeout(() => {
				document.getElementById("results").style.display = "none"
				debounce = false
				runGame()
			}, 500)
		}
	})
	
	document.getElementById("resultsmenubutton").addEventListener("click", () => {
		if (!debounce) {
			debounce = true

			document.getElementById("results").style.opacity = 0
			document.getElementById("game").style.display = "none"
				document.getElementById("mainMenu").style.display = "flex"
			
			setTimeout(() => {
				document.getElementById("results").style.display = "none"
				debounce = false
			}, 500)
		}
	})
}
