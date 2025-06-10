document.addEventListener("DOMContentLoaded", () => {
    // loading section's CSS 
    function loadCSS(href){
        const existingLink = [...document.styleSheets].find(sheet => sheet.href?.includes(href));
        
        if(!existingLink){
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
        }
    }

    // to load About Us Section
    fetch("/static/pages/landingSections/about.html")
        .then(response => response.text())
        
        .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const aboutContent = doc.querySelector(".landingSectionTwo");
        if (aboutContent) {
            document.getElementById("aboutSection").appendChild(aboutContent);
            loadCSS("/static/css/about.css"); // loading about css 
        }
        });

    // to load Works Section
    fetch("/static/pages/landingSections/works.html")
        .then(response => response.text())

        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const aboutContent = doc.querySelector(".landingSectionThree");
          if (aboutContent) {
            document.getElementById("workSection").appendChild(aboutContent);
            loadCSS("/static/css/works.css");
      
            // load JS file 
            const script = document.createElement("script");
            script.src = "/static/js/works.js";
            script.onload = () => {
              if (typeof initializeCarousel === "function") {
                initializeCarousel(); 
              }
            };
            document.body.appendChild(script);
          }
        });
      
      // to load Feature Section
      fetch("/static/pages/landingSections/features.html")
      .then(response => response.text())
      
      .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const aboutContent = doc.querySelector(".landingSectionFour");
      if (aboutContent) {
          document.getElementById("featureSection").appendChild(aboutContent);
          loadCSS("/static/css/features.css"); // loading about css 
      }
      });
      

  // scrolling behavior for sections 
  document.getElementById("aboutBlob").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("aboutSection").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("workBlob").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("workSection").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("featureBlob").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("featureSection").scrollIntoView({ behavior: "smooth" });
  });
});