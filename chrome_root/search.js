var settings;
var favorites;
var goods;
var alternates;
var funnies;
var stares;

const cMaxAutoLoad = 1000;

async function readFromStorage(key)
{
	var readResult = await chrome.storage.local.get(key);
	var valueStr = JSON.stringify(readResult[key]);
	if (valueStr)
		valueStr = valueStr.slice(0, 100) + "...";
	console.log("read " + key + ": " + valueStr);
	return readResult[key];
}

async function saveToStorage(key, value)
{
	var valueStr = JSON.stringify(JSON.stringify(value));
	if (valueStr)
		valueStr = valueStr.slice(0, 100) + "...";
	console.log("saving " + key + ": " + valueStr);
	await chrome.storage.local.set({[key]: value}).then(() => { console.log(key + " saved") });
}

async function readSettings()
{
	var readSettings = await readFromStorage("settings");
	settings = readSettings || {
		maxResults: 300
	}
}

async function saveSettings()
{
	await saveToStorage("settings", settings);
}

async function readFavorites()
{
	var readFavorites = await readFromStorage("favorites");
	favorites = new Set();
	if (readFavorites) {
		try {
			favorites = new Set(readFavorites)
		} catch {}
	}
	
	var readGoods = await readFromStorage("goods");
	goods = new Set();
	if (readGoods) {
		try {
			goods = new Set(readGoods)
		} catch {}
	}
	
	var readAlternates = await readFromStorage("alternates");
	alternates = new Set();
	if (readAlternates) {
		try {
			alternates = new Set(readAlternates)
		} catch {}
	}
	
	var readFunnies = await readFromStorage("funnies");
	funnies = new Set();
	if (readFunnies) {
		try {
			funnies = new Set(readFunnies)
		} catch {}
	}
	
	var readStares = await readFromStorage("stares");
	stares = new Set();
	if (readStares) {
		try {
			stares = new Set(readStares)
		} catch {}
	}
}

async function saveFavorites()
{
	await saveToStorage("favorites", Array.from(favorites));
	await saveToStorage("goods", Array.from(goods));
	await saveToStorage("alternates", Array.from(alternates));
	await saveToStorage("funnies", Array.from(funnies));
	await saveToStorage("stares", Array.from(stares));
}

async function readStorage()
{
	await readSettings();
	await readFavorites();
}

function isViewSupported() {
	var resultsGrid = document.getElementsByClassName("ResultsGrid");
	if (resultsGrid.length == 0) {
		console.log("Only grid views are supported.")
		return false;
	}
	return true;
}

var results = [];
var resultIds = new Set();
var resultOrigOrder = {};

function clearResults() {
	results = [];
	resultIds = new Set();
	resultOrigOrder = {};
}

var additionalLoadCount = 0
const cImagesPerLoad = 30

function loadMoreResults() {
	if (results.length == 0)
		return;
	
	var pagination = document.getElementsByClassName("pagination")[0];
	for (pagChild of pagination.childNodes) {
		if (pagChild.type == "button") {
			if (results.length >= settings.maxResults) {
				console.log("Result limit reached.");
			} else if (additionalLoadCount > settings.maxResults / cImagesPerLoad) {
				console.log("Safety additional load limit reached")
			} else if (isViewSupported()) {
				console.log("loading more results");
				pagChild.click();
				additionalLoadCount += 1
			}
			break;
		}
	}
}

function getResultId(result) {
	return result.querySelector("[data-asset-id]").getAttribute("data-asset-id");
}

function getNumRatings(result) {
	var ratings = result.querySelector(".RatingStars-count")
	if (!ratings)
		return 0;
	return Number(result.querySelector(".RatingStars-count").textContent.match(/\d+/))
}

function getStarRating(result) {
	var stars = result.querySelector(".RatingStars")
	if (!stars)
		return 0;
	return Number(stars.querySelector("[class=is-visuallyHidden]").textContent.match(/\d+/))
}

function getCheckboxState(result, checkboxClassName) {
	var checkBox = result.getElementsByClassName(checkboxClassName)[0];
	return checkBox && checkBox.checked;
}

function getAcornRating(result) {
	if (getCheckboxState(result, "favCheck"))
		return 3;
	if (getCheckboxState(result, "goodCheck"))
		return 2;
	return 0;
}

function getAlternateRating(result) { return getCheckboxState(result, "altCheck");} 
function getFunnyRating(result) { return getCheckboxState(result, "funnyCheck");} 
function getStareRating(result) { return getCheckboxState(result, "stareCheck");} 

function getOriginalOrder(result) {
	return resultOrigOrder[getResultId(result)];
}

function createAcornizerIconElement(size)
{
	var img = document.createElement("img");
	img.src = chrome.runtime.getURL("icon.png");
	img.style = `width:${size}px;height:${size}px`;
	return img;
}

function readNewCards() {
	var resultItems = document.getElementsByClassName("ResultsGrid-card");
	var gotNewResult = false;
	var cardOrder = 1;
	for (result of resultItems) {
		const resultId = getResultId(result);
		if (!resultIds.has(resultId))
		{
			resultOrigOrder[resultId] = cardOrder;
			
			gotNewResult = true;
			//console.log("num ratings " + getNumRatings(result));
			//console.log("rating " + getStarRating(result));
			resultIds.add(resultId);
			// NOTE: cloning breaks site code. Have to manipulate in place.
			results.push(result);
			
			// add acornizer controls
			var capDiv = result.getElementsByClassName("ResultsGrid-caption")[0];
			if (capDiv.getElementsByClassName("favDiv").length == 0) {
				// add fav div
				var userDiv = capDiv.getElementsByClassName("userDateLoc")[0];
				var favDiv = document.createElement("div");
				favDiv.classList.add("favDiv");
				capDiv.insertBefore(favDiv, userDiv);
				
				favDiv.appendChild(createAcornizerIconElement(20));
				
				var favCheck = document.createElement("input");
				favCheck.classList.add("favCheck");
				favCheck.setAttribute("type", "checkbox");
				favCheck.checked = favorites.has(resultId);
				favCheck.addEventListener("change", (e) => {
					if (e.target.checked) {
						favorites.add(resultId);
						goods.delete(resultId);
						alternates.delete(resultId);
						e.target.parentElement.getElementsByClassName("goodCheck")[0].checked = false;
						e.target.parentElement.getElementsByClassName("altCheck")[0].checked = false;
					} else {
						favorites.delete(resultId);
					}
					saveFavorites();
					updateOrdering();
					});
				favDiv.appendChild(favCheck);
				favDiv.appendChild(document.createTextNode("Favorite "));
				
				var goodCheck = document.createElement("input");
				goodCheck.classList.add("goodCheck");
				goodCheck.setAttribute("type", "checkbox");
				goodCheck.checked = goods.has(resultId);
				goodCheck.addEventListener("change", (e) => {
					if (e.target.checked) {
						goods.add(resultId);
						favorites.delete(resultId);
						alternates.delete(resultId);
						e.target.parentElement.getElementsByClassName("favCheck")[0].checked = false;
						e.target.parentElement.getElementsByClassName("altCheck")[0].checked = false;
					} else {
						goods.delete(resultId);
					}
					saveFavorites();
					updateOrdering();
					});
				favDiv.appendChild(goodCheck);
				favDiv.appendChild(document.createTextNode("Good "));
				
				var altCheck = document.createElement("input");
				altCheck.classList.add("altCheck");
				altCheck.setAttribute("type", "checkbox");
				altCheck.checked = alternates.has(resultId);
				altCheck.addEventListener("change", (e) => {
					if (e.target.checked) {
						alternates.add(resultId);
						goods.delete(resultId);
						favorites.delete(resultId);
						e.target.parentElement.getElementsByClassName("goodCheck")[0].checked = false;
						e.target.parentElement.getElementsByClassName("favCheck")[0].checked = false;
					} else {
						alternates.delete(resultId);
					}
					saveFavorites();
					updateOrdering();
					});
				favDiv.appendChild(altCheck);
				favDiv.appendChild(document.createTextNode("Alternate "));
				
				var funnyCheck = document.createElement("input");
				funnyCheck.classList.add("funnyCheck");
				funnyCheck.setAttribute("type", "checkbox");
				funnyCheck.checked = funnies.has(resultId);
				funnyCheck.addEventListener("change", (e) => {
					if (e.target.checked) {
						funnies.add(resultId);
					} else {
						funnies.delete(resultId);
					}
					saveFavorites();
					updateOrdering();
					});
				favDiv.appendChild(document.createTextNode(" | "));
				favDiv.appendChild(funnyCheck);
				favDiv.appendChild(document.createTextNode("Funny "));
				
				var stareCheck = document.createElement("input");
				stareCheck.classList.add("stareCheck");
				stareCheck.setAttribute("type", "checkbox");
				stareCheck.checked = stares.has(resultId);
				stareCheck.addEventListener("change", (e) => {
					if (e.target.checked) {
						stares.add(resultId);
					} else {
						stares.delete(resultId);
					}
					saveFavorites();
					updateOrdering();
					});
				favDiv.appendChild(stareCheck);
				favDiv.appendChild(document.createTextNode("Staring"));
				
				// add image url
				var modifiedLibraryDiv = document.createElement("div")
				modifiedLibraryDiv.style = "display: flex; justify-content: space-between"
				var libraryAnchor = capDiv.lastChild
				capDiv.appendChild(modifiedLibraryDiv)
				modifiedLibraryDiv.appendChild(libraryAnchor)
				var customLibraryDiv = document.createElement("div")
				customLibraryDiv.appendChild(createAcornizerIconElement(18));
				var libraryImageUrl = document.createElement("a");
				libraryImageUrl.href = `https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${resultId}/2400`
				libraryImageUrl.target = "_blank"
				libraryImageUrl.innerText = "Image Link"
				customLibraryDiv.appendChild(libraryImageUrl)
				modifiedLibraryDiv.appendChild(customLibraryDiv)
				
				// add average rating (query api)
				try {
					var modifiedRatingDiv = document.createElement("div")
					modifiedRatingDiv.style = "display: flex; justify-content: space-between"
					var userDiv = capDiv.getElementsByClassName("userDateLoc")[0]
					capDiv.insertBefore(modifiedRatingDiv, userDiv)
					var ratingAnchor = capDiv.getElementsByClassName("RatingStars")[0]
					modifiedRatingDiv.appendChild(ratingAnchor)
					var customRatingDiv = document.createElement("div")
					customRatingDiv.style = "display: flex"
					customRatingDiv.appendChild(createAcornizerIconElement(18));
					var avgRatingDiv = document.createElement("div")
					avgRatingDiv.id = `avg${resultId}`
					avgRatingDiv.innerHTML = 'Avg: (loading...)'
					customRatingDiv.appendChild(avgRatingDiv)
					modifiedRatingDiv.appendChild(customRatingDiv)
					
					fetch(`https://media.ebird.org/internal/v1/get-rating/${resultId}`)
						.then(r => {
							if (r.ok) {
								return r.json()
							}
							throw new Error('rating query failed')
						})
						.then(data => {
							ratingDivToUpdate = document.getElementById(`avg${resultId}`)
							resultRatings = data[resultId]
							ratingDivToUpdate.innerHTML = 'Avg: ' + parseFloat(resultRatings.ratingAverage.toFixed(3)).toString()
							if ("myRating" in resultRatings && resultRatings.myRating > 0) {
								ratingDivToUpdate.innerHTML = "My: " + resultRatings.myRating.toString() + " | " + ratingDivToUpdate.innerHTML;
							}
						})
						.catch(err => {
							console.error('rating query failed')
						})
				} catch (e) {
					// ignoring missing ratings, etc
				}
			}
		}
		cardOrder += 1;
	}
	return gotNewResult;
}

function acornSorted() {
	return results.sort(function(a, b) {
		if (settings.sortByFunny)
		{
			var aa = getFunnyRating(a);
			var ba = getFunnyRating(b);
			if (aa > ba)
				return -1;
			if (aa < ba)
				return 1;
		}
		if (settings.sortByStare)
		{
			var aa = getStareRating(a);
			var ba = getStareRating(b);
			if (aa > ba)
				return -1;
			if (aa < ba)
				return 1;
		}
		if (settings.sortByFavorites)
		{
			var aa = getAcornRating(a);
			var ba = getAcornRating(b);
			if (aa > ba)
				return -1;
			if (aa < ba)
				return 1;
		}
		if (settings.sortByAlternates)
		{
			var aa = getAlternateRating(a);
			var ba = getAlternateRating(b);
			if (aa > ba)
				return -1;
			if (aa < ba)
				return 1;
		}
		if (settings.sortByNumRatings)
		{
			var ar = getNumRatings(a);
			var br = getNumRatings(b);
			if (ar > br)
				return -1;
			if (ar < br)
				return 1;
		}
		var as = getOriginalOrder(a);
		var bs = getOriginalOrder(b);
		if (as < bs)
			return -1;
		if (as > bs)
			return 1;
		console.log("oops?");
		return 0;
	});
}

function applyOrdering(containerElem, orderedElems) {
	for (elem of orderedElems.toReversed()) {
		containerElem.insertBefore(elem, containerElem.firstChild);
	}
}

function updateOrdering() {
	console.log("reordering");
	// rebuild results grid from saved results
	var resultsGrid = document.getElementsByClassName("ResultsGrid")[0];
	applyOrdering(resultsGrid, acornSorted());
}

function applyAcorns() {
	if (!readNewCards())
		return;
	
	console.log("# results: " + results.length);
	
	updateOrdering();
}

var resultsObserver = null;

function observeResults() {
	if (!resultsObserver) {
		resultsObserver = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				for (addedNode of mutation.addedNodes) {
					applyAcorns();
					if (addedNode.type == "li") {
						applyAcorns();
					}
				}
			})
		});
		var resultsGrid = document.getElementsByClassName("ResultsGrid")[0];
		resultsObserver.observe(resultsGrid, { childList: true });
	}
}

function processSearchResults() {
	if (!isViewSupported())
		return;
	observeResults();
	applyAcorns();
	loadMoreResults();
}

function refreshView() {
	if (!isViewSupported())
		return;
	clearResults();
	processSearchResults();
	updateOrdering();
}

var wasViewSupported = isViewSupported();
function observePageChanges() {
	var pagination = document.getElementsByClassName("pagination")[0];
	var paginationObserver = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				for (addedNode of mutation.addedNodes) {
					if (addedNode.type == "button") {
						if (!isViewSupported())
							return;
						loadMoreResults();
					}
				}
			})
		});
	paginationObserver.observe(pagination, { childList: true });
	
	var viewObserver = new MutationObserver(function(mutations) {
			if (wasViewSupported != isViewSupported())
			{
				console.log("view change");
				if (isViewSupported()) {
					refreshView();
				}
				addSettings();
			}
			wasViewSupported = isViewSupported();
		});
	viewObserver.observe(document, { childList: true, subtree: true });

	function observeFilterElement(element) {
		//console.log("observing " + element.textContent);
		var filterSpanObserver = new MutationObserver(function (mutations) {
			console.log("filter change");
			clearResults();
			loadMoreResults();
		});
		filterSpanObserver.observe(span, {  characterData: true, attributes: false, childList: false, subtree: true })
		filterSpanObservers.push(filterSpanObserver);
	}

	var activeFiltersDiv = document.getElementsByClassName("ActiveFilters")[0];
	var filterSpanObservers = [];
	var filterObserver = new MutationObserver(function(mutations) {
			console.log("resetting results");
			
			for (mutation of mutations) {
				for (addedNode of mutation.addedNodes) {
					for (span of addedNode.getElementsByTagName("span")) {
						observeFilterElement(span);
					}
				}
			}
			
			clearResults();
			loadMoreResults();
		});
	filterObserver.observe(activeFiltersDiv, { childList: true, subtree: true });
	for (span of activeFiltersDiv.getElementsByTagName("span")) {
		observeFilterElement(span);
	}

	var filtersDiv = document.getElementsByClassName("filters")[0];
	var currentSortDiv = filtersDiv.getElementsByClassName("filterSection--last")[0];
	for (span of currentSortDiv.getElementsByTagName("span")) {
		observeFilterElement(span);
	}
}

function addSettings()
{
	var existingSettingsDiv = document.getElementById("settingsDiv");
	if (existingSettingsDiv)
		existingSettingsDiv.parentElement.removeChild(existingSettingsDiv);
	
	var resultsGrid = document.getElementsByClassName("ResultsGrid");
	if (resultsGrid.length == 0)
		return;
	resultsGrid = resultsGrid[0];
	
	var settingsDiv = document.createElement("div");
	settingsDiv.id = "settingsDiv";
	resultsGrid.parentElement.insertBefore(settingsDiv, resultsGrid);
	
	var maxResultsInput = document.createElement("input");
	maxResultsInput.setAttribute("type", "number");
	maxResultsInput.id = "maxResultsInput";
	maxResultsInput.min = 1;
	maxResultsInput.max = cMaxAutoLoad;
	maxResultsInput.value = settings.maxResults;
	maxResultsInput.addEventListener("change", (e) => {
		var input = document.getElementById("maxResultsInput");
		input.value = Math.min(input.max, Math.max(input.min, input.value));
		updateSettings().then(loadMoreResults);
	});
	
	settingsDiv.appendChild(createAcornizerIconElement(25));
	settingsDiv.appendChild(document.createTextNode("Auto-Load Results: "));
	settingsDiv.appendChild(maxResultsInput);
	
	settingsDiv.appendChild(document.createTextNode(" "));
	
	var favSortCheck = document.createElement("input");
	favSortCheck.id = "favSortCheck";
	favSortCheck.setAttribute("type", "checkbox");
	favSortCheck.checked = settings.sortByFavorites;
	favSortCheck.addEventListener("change", () => {
		updateSettings().then(updateOrdering);
		});
	settingsDiv.appendChild(document.createTextNode("Sort by "));
	settingsDiv.appendChild(favSortCheck);
	settingsDiv.appendChild(document.createTextNode(" Favorites"));
	
	var altSortCheck = document.createElement("input");
	altSortCheck.id = "altSortCheck";
	altSortCheck.setAttribute("type", "checkbox");
	altSortCheck.checked = settings.sortByAlternates;
	altSortCheck.addEventListener("change", () => {
		updateSettings().then(updateOrdering);
		});
	settingsDiv.appendChild(document.createTextNode(", then by "));
	settingsDiv.appendChild(altSortCheck);
	settingsDiv.appendChild(document.createTextNode(" Alternates"))
	
	var ratingCountSortCheck = document.createElement("input");
	ratingCountSortCheck.id = "numRatingsSortCheck";
	ratingCountSortCheck.setAttribute("type", "checkbox");
	ratingCountSortCheck.checked = settings.sortByNumRatings;
	ratingCountSortCheck.addEventListener("change", () => {
		updateSettings().then(updateOrdering);
		});
	settingsDiv.appendChild(document.createTextNode(", then by "));
	settingsDiv.appendChild(ratingCountSortCheck);
	settingsDiv.appendChild(document.createTextNode(" # of ratings"));
	
	settingsDiv.appendChild(document.createTextNode(". Show on top: "));
	
	var funnySortcheck = document.createElement("input");
	funnySortcheck.id = "funnySortCheck";
	funnySortcheck.setAttribute("type", "checkbox");
	funnySortcheck.checked = settings.sortByFunny;
	funnySortcheck.addEventListener("change", (e) => {
		if (e.target.checked) {
			document.getElementById("stareSortCheck").checked = false;
		}
		updateSettings().then(updateOrdering);
		});
	settingsDiv.appendChild(funnySortcheck);
	settingsDiv.appendChild(document.createTextNode(" Funny"));
	
	var stareSortCheck = document.createElement("input");
	stareSortCheck.id = "stareSortCheck";
	stareSortCheck.setAttribute("type", "checkbox");
	stareSortCheck.checked = settings.sortByStare;
	stareSortCheck.addEventListener("change", (e) => {
		if (e.target.checked) {
			document.getElementById("funnySortCheck").checked = false;
		}
		updateSettings().then(updateOrdering);
		});
	settingsDiv.appendChild(document.createTextNode(", or "));
	settingsDiv.appendChild(stareSortCheck);
	settingsDiv.appendChild(document.createTextNode(" Staring."));
}

async function updateSettings()
{
	await readSettings();
	settings.maxResults = document.getElementById("maxResultsInput").value;
	settings.sortByFavorites = document.getElementById("favSortCheck").checked;
	settings.sortByAlternates = document.getElementById("altSortCheck").checked;
	settings.sortByNumRatings = document.getElementById("numRatingsSortCheck").checked;
	settings.sortByFunny = document.getElementById("funnySortCheck").checked;
	settings.sortByStare = document.getElementById("stareSortCheck").checked;
	await saveSettings();
}

function acornize() {
	processSearchResults();
	observePageChanges();
	addSettings();
}

readStorage().then(() => acornize());
