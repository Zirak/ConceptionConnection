var form = document.container,
	results = document.getElementById('results');

form.onsubmit = function (e) {
	e.preventDefault();

	this.implore.disabled = true;
	empty(results);

	conceptionConnection();
};

function conceptionConnection () {
	var bday = new Date(Date.parse(form.date.value)),
		cday = calcConceptionDate(
			bday, Number(form.premature.value), Number(form.term.value));

	console.log(cday);
	announce('You were conceived at approx. ' + cday.toDateString());

	doRequest(cday.getFullYear(), function (res) {
		res = filterResults(res, cday);
		output(res);
	});
}

function calcConceptionDate (bday, offset, dir) {
	var ret = new Date(bday.getTime());
	ret.setDate(ret.getDate() - 280); //40(weeks) * 7(days/week) = 280(days)
	ret.setDate(ret.getDate() + dir * offset)

	return ret;
}

function filterResults (resp, date) {
	var html = getActualResult(resp);

	//give a leeway of a 8 days. why 8? I vaguely remember that's the accuarcy
	// of the 40 weeks thing.
	var minDate = new Date(date.getTime()),
		maxDate = new Date(date.getTime());
	minDate.setDate(date.getDate() - 8);
	maxDate.setDate(date.getDate() + 8);

	//now comes to tricky part: doing bastard parsing of the returned html
	//we cheat by creating a container for that page
	var root = document.createElement('body');
	root.innerHTML = html; //forgive me...

	var months = [
		'january', 'february', 'march', 'april',
		'may', 'june', 'july', 'august',
		'september', 'october', 'november', 'december'
	];
	var min = {
		month : months[minDate.getMonth()],
		day : minDate.getDate()
	};
	var max = {
		month : months[maxDate.getMonth()],
		day : maxDate.getDate()
	};
	console.log(min, max);

	//if they're on the same month, this eases things for us, since we don't
	// have to select events from 2 distinct months
	var comparer;
	if (max.month === min.month) {
		comparer = function (otherMonth, otherDay) {
			return otherMonth === max.month && (
				otherDay <= max.day && otherDay >= min.day );
		};
	}
	else {
		comparer = function (otherMonth, otherDay) {
			return (
				//max
				(otherMonth === max.month && otherDay <= max.day)
				||
				//min
				(otherMonth === min.month && otherDay >= min.day)
			);
		};
	}

	//we only look at events, not deaths/births
	var stopNode = root.getElementsByTagName('h2')[1];
	return getEvents(comparer);

	function getEvents (comparer) {
		var matches = [];
		(function filterEvents (root) {
			var node = root.firstElementChild;

			for (; node; node = node.nextElementSibling) {
				if (node === stopNode) {
					return;
				}

				var tag = node.tagName;
				if (tag === 'UL') {
					filterEvents(node);
					continue;
				}
				else if (tag !== 'LI') {
					continue;
				}

				var parts = /(\w+)\s(\d+)/.exec(node.firstChild.data);

				if (!parts) {
					continue;
				}
				var otherMonth = parts[1].toLowerCase(),
					otherDay = Number(parts[2]);

				if (comparer(otherMonth, otherDay)) {
					console.log(otherMonth, otherDay);
					matches.push(node);
				}
			}
		})(root);

		//we need to flatten out the resulting elements, and we're done!
		return flatten(matches);
	}

	function flatten (lis) {
		return [].reduce.call(lis, extract, []);
	}
	function extract (ret, li) {
		console.log(li);
		if (li.children.length) {
			ret.push.apply(ret, flatten(li.getElementsByTagName('li')));
		}
		else {
			var data = li.firstChild.data;
			//October 4 – ...
			data = data
				.replace(/^\w+\s+\d+\s+\u2013/, '')
				.trim();
			console.log(data);

			ret.push(data);
		}
		return ret;
	}
	//PHEW
}

function getActualResult (resp) {
	var query = resp.query,
		pageid = query.pageids[0];
	return query.pages[pageid].extract;
}

function doRequest (year, cb) {
	//see the wikipedia API page: https://www.mediawiki.org/wiki/API
	var url = 'http://en.wikipedia.org/w/api.php?format=json&callback=API_REQUEST_DONE&action=query&prop=extracts&indexpageids&titles=' + encodeURIComponent(year);

	var script = document.createElement('script');
	script.src = url;

	window.API_REQUEST_DONE = function (resp) {
		//cleanup on aisle 4
		delete window.API_REQUEST_DONE;
		script.parentNode.removeChild(script);

		cb(resp);
	};

	document.head.appendChild(script);
}

function output (res) {
	var events = document.createElement('ul'),
		text;

	if (res.length) {
		text = 'Most likely historical events that aroused your parents:';
	}
	else {
		text = 'Nothing historic aroused your parents';
	}
	announce(text);

	form.implore.disabled = false;
	res.forEach(outputLi);

	results.appendChild(events);

	function outputLi (ev) {
		var li = document.createElement('li');
		li.textContent = ev;
		events.appendChild(li);
	}
}

function announce (msg) {
	var cont = document.createElement('div');
	cont.textContent = msg;
	results.appendChild(cont);
}

function empty (el) {
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
}
