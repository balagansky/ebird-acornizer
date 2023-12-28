chrome.storage.local.get(null).then((result) => {
	document.getElementById("exportText").textContent = JSON.stringify(result);
});

document.getElementById("importButton").addEventListener("click", () => {
	var importResultElement = document.getElementById("importResult");
	try {
		var importData = JSON.parse(document.getElementById("importText").value);
		chrome.storage.local.set(importData).then((result)=>{
			importResultElement.textContent = "Import successful.";
		}, (failResult)=>{
			importResultElement.textContent = ""+failResult;
		});
		
	} catch (e) {
		importResultElement.textContent = ""+e;
	}
});