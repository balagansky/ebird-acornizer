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

var results = [];
var resultIds = new Set();

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

function getResultId(result) {
	return result.querySelector("[data-asset-id]").getAttribute("data-asset-id");
}

function getNumRatings(result) {
	return Number(result.querySelector(".RatingStars-count").textContent.match(/\d+/))
}

function getStarRating(result) {
	return Number(result.querySelector(".RatingStars").querySelector("[class=is-visuallyHidden]").textContent.match(/\d+/))
}

function applyAcorns() {
	console.log("applying");
	var resultsGrid = document.getElementsByClassName("ResultsGrid")[0];
	var resultItems = document.getElementsByClassName("ResultsGrid-card");
	var gotNewResult = false;
	for (result of resultItems) {
		resultId = getResultId(result);
		if (!resultIds.has(resultId))
		{
			gotNewResult = true;
			console.log("num ratings " + getNumRatings(result));
			console.log("rating " + getStarRating(result));
			resultIds.add(resultId);
			results.push(result.cloneNode(true));
		}
	}
	if (!gotNewResult)
		return;
	
	// rebuild results grid from saved results
	resultsGrid.textContent = '';
	
	sorted_results = results.sort(function(a, b) {
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
	
	for (result of sorted_results) {
		resultsGrid.appendChild(result);
	}
	console.log("# results: " + results.length);
}

}

main();

// TODO: react to view type changes
