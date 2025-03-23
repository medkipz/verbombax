import wordlist from "./words.js"

const standardRequireds = ["ab", "ac", "ad", "ae", "ag", "am", "au", "bi", "ci", "ce", "co", "cr", "de", "di", "ea", "eg", "es", "et", "fa", "fu", "ic", "im", "in", "la", "le", "ma", "mi", "me", "ne", "no", "pu", "pe", "qu", "re", "se", "ta", "te", "un", "v"]
const bulletRequireds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "l", "m", "n", "o", "p", "q", "r", "s", "t", "v", "x", "y", "z"]

let textbox = null
let timer = null
let animationStartTime = null

// data persistence
let highScore = localStorage.getItem("High Score") || 0
document.getElementById("highScoreDisplay").textContent = "High Score: " + highScore

// settings variables
let isSoundEnabled = true

// game variables
let usedWords = []
let timeLimitMs = 0
let currentScore = 0
let currentLives = 0
let currentRequired = ""

// gameplay settings variables
let possibleRequireds = standardRequireds
let maxTimeLimitMs = 8000
let maxLives = 2

// a modified xorshift alogorithm (https://en.wikipedia.org/wiki/xorshift)
// In testing, the numbers it generates are roughly evenly distributed, though its probably not statistically perfect

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

	circle.style.animation = null
	circle.offsetHeight

	if (animationStartTime) {
		let animationOffset = Date.now() - animationStartTime
		let rotation = animationOffset / timeMs * 360
		circle.style.setProperty("--startRotation", rotation + "deg")

		circle.style.animation = "spin " + quickAnimationMs + "ms"
		setTimeout(() => {
			circle.style.animation = null
			circle.offsetHeight
			animationStartTime = Date.now()
			circle.style.setProperty("--startRotation", 0 + "deg")
			circle.style.animation = "spin linear " + (timeMs - quickAnimationMs) + "ms"
		}, quickAnimationMs)
	} else {
		circle.offsetHeight
		animationStartTime = Date.now()
		circle.style.animation = "spin linear " + timeMs + "ms"
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
	document.getElementById("scoreDisplay").textContent = "Score: " + currentScore
	if (currentScore > highScore) {
		highScore = currentScore
		localStorage.setItem("High Score", highScore)
		document.getElementById("highScoreDisplay").textContent = "High Score: " + highScore
	}
}

function failedWord() {
	currentLives--

	document.getElementById("failvignette").style.opacity = 1
	setTimeout(() => {
		document.getElementById("failvignette").style.opacity = 0
	}, 300)

	if (currentLives <= 0) {
		animationStartTime = null
		showAlert("Time's Up!<br>Your Score: " + currentScore + "<br>High Score: " + highScore, 3000)
		setScore(0)
		usedWords = []
		rng.setSeed(document.getElementById("seedInput").value ? document.getElementById("seedInput").value : Date.now())
	
		if (textbox) {
			document.body.removeChild(textbox)
		}
	
		document.getElementById("mainMenu").style.display = "flex"
		document.getElementById("game").style.display = "none"
		displayCharacters("", "")
	} else {
		textbox.value = ""
		currentRequired = possibleRequireds[rng.nextInt(0, possibleRequireds.length - 1)] 
		displayCharacters(textbox.value, currentRequired)
		clearTimeout(timer)
		timer = setTimeout(failedWord, timeLimitMs)
		animateCircle(timeLimitMs)
	}
}

// MAIN CODE
function runGame() {
	document.getElementById("chardisplay").style.animation = null
	document.getElementById("chardisplay").offsetHeight
	document.getElementById("mainMenu").style.display = "none"
	document.getElementById("game").style.display = "flex"

	textbox = document.createElement("input")
	textbox.className = "gameinput"
	currentRequired = possibleRequireds[rng.nextInt(0, possibleRequireds.length - 1)] 
	displayCharacters(textbox.value, currentRequired)

	timeLimitMs = maxTimeLimitMs + 2000
	currentLives = maxLives

	document.body.appendChild(textbox)
	timer = setTimeout(failedWord, timeLimitMs)
	textbox.focus()

	textbox.addEventListener("input", () => {
		displayCharacters(textbox.value, currentRequired)
	})

	animateCircle(timeLimitMs)

	textbox.addEventListener("keypress", input =>{
		if (input.key == "Enter") {
			if (wordlist[textbox.value.toLowerCase()] && !usedWords[textbox.value.toLowerCase()] && textbox.value.indexOf(currentRequired) != -1 ) {
				usedWords[textbox.value.toLowerCase()] = true
				setScore(currentScore + 1)
				timeLimitMs = (Math.E ** (-currentScore / 50)) * maxTimeLimitMs + 2000
	
				textbox.value = ""
				currentRequired = possibleRequireds[rng.nextInt(0, possibleRequireds.length - 1)] 
				displayCharacters(textbox.value, currentRequired)
				clearTimeout(timer)
				timer = setTimeout(failedWord, timeLimitMs)
				animateCircle(timeLimitMs)
			} else {
				document.getElementById("chardisplay").style.animation = null
				document.getElementById("chardisplay").offsetHeight
				document.getElementById("chardisplay").style.animation = "incorrectShake 0.15s"
	
				if (textbox.value.toLowerCase().indexOf(currentRequired) == -1) {
					showAlert("That word does not contain the prompt", 750)
				} else if (usedWords[textbox.value.toLowerCase()]) {
					showAlert("You've already used that word", 750)
				} else if (!wordlist[textbox.value.toLowerCase()]) {
					showAlert("That word does not exist", 750)
				}
			}
		} else {
			// Might be bad code... But the text box is updated after this event is fired, so we need to wait a millisecend to get the updated value
			setTimeout(() =>  {
				let audio = new Audio('/sounds/cowbell.wav')
				audio.volume = 0.35
				audio.playbackRate = Math.min(0.5 * textbox.value.length / 10 + .75, 1.5)
				audio.preservesPitch = false
				playSound(audio)
			}, 1)
		}
	})
}

document.getElementById("playButton").addEventListener("click", runGame)
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

document.getElementById("soundEnableCheckbox").addEventListener("change", () => {
	isSoundEnabled = document.getElementById("soundEnableCheckbox").checked
})

document.getElementById("bulletModeCheckbox").addEventListener("change", () => {
	if (document.getElementById("bulletModeCheckbox").checked) {
		maxTimeLimitMs = 1000
		possibleRequireds = bulletRequireds
	} else {
		maxTimeLimitMs = 8000
		possibleRequireds = standardRequireds
	}
})

document.getElementById("seedInput").addEventListener("input", () => {
	rng.setSeed(document.getElementById("seedInput").value)
})