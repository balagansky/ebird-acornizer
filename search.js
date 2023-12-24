console.log("running2");

function main() {

var resultsGrid = document.getElementsByClassName("ResultsGrid");
if (resultsGrid.length == 0) {
	console.log("Only grid views are supported.")
	return;
}

// check if user is logged in
function getCurrentUser() {
	// must find this indirectly
	for (blah of document.getElementsByClassName("Header-group-heading"))
	{
		
	}
	
	return "TODO";
}
var currentUser = getCurrentUser();

if (!currentUser)
{
	console.log("Not logged in.");
	return;
}

// indirectly determine if this is filtering for the current user
for (blah of document.getElementsByClassName("Icon--user"))
{
	//console.log(blah);
}

console.log(currentUser);

var pagination = document.getElementsByClassName("pagination")[0];
var paginationObserver = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			for (addedNode of mutation.addedNodes) {
				if (addedNode.type == "button") {
					loadMoreResults();
				}
			}
		})
	});
paginationObserver.observe(pagination, { childList: true });

function loadMoreResults() {
	for (pagChild of pagination.childNodes) {
		if (pagChild.type == "button") {
			console.log("loading more results");
			pagChild.click();
			break;
		}
	}
}

function getResultId(result) {
	return result.querySelector("[data-asset-id]").getAttribute("data-asset-id");
}

function getNumRatings(result) {
	return Number(result.querySelector(".RatingStars-count").textContent.match(/\d+/))
}

function getStarRating(result) {
	return Number(result.querySelector(".RatingStars").querySelector("[class=is-visuallyHidden]").textContent.match(/\d+/))
}

var results = [];
var resultIds = new Set();

//<a href="https://macaulaylibrary.org/asset/611860447" target="_blank" class="newTabMenu" style="left: 251px; top: 113.031px;">Open link in new tab</a>

function readNewCards() {
	var resultItems = document.getElementsByClassName("ResultsGrid-card");
	var gotNewResult = false;
	for (result of resultItems) {
		resultId = getResultId(result);
		if (!resultIds.has(resultId))
		{
			gotNewResult = true;
			//console.log("num ratings " + getNumRatings(result));
			//console.log("rating " + getStarRating(result));
			resultIds.add(resultId);
			// NOTE: cloning breaks site code. Have to manipulate in place.
			results.push(result);
		}
	}
	return gotNewResult;
}

function sortedByNumRatings() {
	return results.sort(function(a, b) {
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

function applyAcorns() {
	if (!readNewCards())
		return;
	
	console.log("# results: " + results.length);
	
	// rebuild results grid from saved results
	var resultsGrid = document.getElementsByClassName("ResultsGrid")[0];
	applyOrdering(resultsGrid, sortedByNumRatings());
}

applyAcorns();
loadMoreResults();

var resultsObsever = new MutationObserver(function(mutations) {
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
resultsObsever.observe(resultsGrid, { childList: true });

}

main();

// TODO: react to view type changes
