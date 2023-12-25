console.log("running2");

function isViewSupported() {
	var resultsGrid = document.getElementsByClassName("ResultsGrid");
	if (resultsGrid.length == 0) {
		console.log("Only grid views are supported.")
		return false;
	}
	return true;
}

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

var results = [];
var resultIds = new Set();

function clearResults() {
	results = [];
	resultIds = new Set();
}

function loadMoreResults() {
	for (pagChild of pagination.childNodes) {
		if (pagChild.type == "button") {
			if (results.length > 500) {
				console.log("Result limit reached.");
			} else if (isViewSupported()) {
				console.log("loading more results");
				pagChild.click();
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
	return Number(result.querySelector(".RatingStars").querySelector("[class=is-visuallyHidden]").textContent.match(/\d+/))
}

function getAcornRating(result) {
	var favBox = result.getElementsByClassName("favCheck")[0];
	if (favBox && favBox.checked) {
		console.log("acorn");
		return 1;
	} else {
		return 0;
	}
}

//<a href="https://macaulaylibrary.org/asset/611860447" target="_blank" class="newTabMenu" style="left: 251px; top: 113.031px;">Open link in new tab</a>

function readNewCards() {
	var resultItems = document.getElementsByClassName("ResultsGrid-card");
	var gotNewResult = false;
	for (result of resultItems) {
		var resultId = getResultId(result);
		if (!resultIds.has(resultId))
		{
			gotNewResult = true;
			//console.log("num ratings " + getNumRatings(result));
			//console.log("rating " + getStarRating(result));
			resultIds.add(resultId);
			// NOTE: cloning breaks site code. Have to manipulate in place.
			results.push(result);
			
			// add fav button
			var capDiv = result.getElementsByClassName("ResultsGrid-caption")[0];
			if (capDiv.getElementsByClassName("favDiv").length == 0) {
				var userDiv = capDiv.getElementsByClassName("userDateLoc")[0];
				var favDiv = document.createElement("div");
				favDiv.classList.add("favDiv");
				capDiv.insertBefore(favDiv, userDiv);
				var favCheck = document.createElement("input");
				favCheck.classList.add("favCheck");
				favCheck.setAttribute("type", "checkbox");
				favCheck.addEventListener("change", updateOrdering);
				favDiv.appendChild(favCheck);
				favDiv.appendChild(document.createTextNode("Favorite"));
			}
		}
	}
	return gotNewResult;
}

function acornSorted() {
	return results.sort(function(a, b) {
		var aa = getAcornRating(a);
		var ba = getAcornRating(b);
		if (aa > ba)
			return -1;
		if (aa < ba)
			return 1;
		var ar = getNumRatings(a);
		var br = getNumRatings(b);
		if (ar > br)
			return -1;
		if (ar < br)
			return 1;
		var as = getStarRating(a);
		var bs = getStarRating(b);
		if (as > bs)
			return -1;
		if (as < bs)
			return 1;
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
	processSearchResults();
	updateOrdering();
}

processSearchResults();

var wasViewSupported = isViewSupported();
var viewObserver = new MutationObserver(function(mutations) {
		if (wasViewSupported != isViewSupported() && isViewSupported()) {
			refreshView();
		}
		wasViewSupported = isViewSupported();
	});
viewObserver.observe(document, { childList: true, subtree: true });

function observeFilterElement(element) {
	//console.log("observing " + element.textContent);
	var filterSpanObserver = new MutationObserver(function (mutations) {
		console.log("filter change");
		clearResults();
	});
	filterSpanObserver.observe(span, {  characterData: true, attributes: false, childList: false, subtree: true })
	filterSpanObservers.push(filterSpanObserver);
}

var activeFiltersDiv = document.getElementsByClassName("ActiveFilters")[0];
var filterSpanObservers = [];
var filterObserver = new MutationObserver(function(mutations) {
		console.log("resetting results");
		clearResults();
		refreshView();
		
		for (mutation of mutations) {
			for (addedNode of mutation.addedNodes) {
				for (span of addedNode.getElementsByTagName("span")) {
					observeFilterSpan(span);
				}
			}
		}
	});
filterObserver.observe(activeFiltersDiv, { childList: true, subtree: true });
for (span of activeFiltersDiv.getElementsByTagName("span")) {
	observeFilterElement(span);
}

