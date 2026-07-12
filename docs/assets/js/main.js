(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll(".sidebar-list a"));
  if (!links.length || !("IntersectionObserver" in window)) return;

  var byId = {};
  links.forEach(function (link) {
    var id = link.getAttribute("href").slice(1);
    var section = document.getElementById(id);
    if (section) byId[id] = link;
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("is-active"); });
          link.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-15% 0px -70% 0px" }
  );

  Object.keys(byId).forEach(function (id) {
    observer.observe(document.getElementById(id));
  });

  var toggle = document.getElementById("nav-toggle");
  if (toggle) {
    links.forEach(function (link) {
      link.addEventListener("click", function () { toggle.checked = false; });
    });
  }
})();
