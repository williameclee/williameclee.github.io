window.MathJax = {
  	"HTML-CSS": {
    	fonts: ["Gyre-Pagella"],
    	imageFont: null,
  	},
    TeX: {
		equationNumbers: { autoNumber: "AMS" },
		Macros: {
			vb: ["\\boldsymbol{\\mathrm{#1}}", 1],
			difffrac: ["\\frac{\\mathrm{d} #1}{\\mathrm{d} #2}", 2],
			partfrac: ["\\frac{\\partial #1}{\\partial #2}", 2],
			Difffrac: ["\\frac{\\mathrm{D} #1}{\\mathrm{D} #2}", 2]
		}
	},
	tex2jax: {
		inlineMath: [['$', '$'], ["\\(", "\\)"]],
	},
	svg: {
		fontCache: 'global',
	}
};
  
(function () {
	var script = document.createElement('script');
	script.src = "https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js?config=TeX-AMS_HTML";
	script.async = true;
	document.head.appendChild(script);
})();

const app = document.querySelector('#app')
app.addEventListener('zero-md-rendered', () => {
	let el = document.createElement('script')
	el.src = "https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js?config=TeX-AMS_HTML";
	document.head.appendChild(el)
});