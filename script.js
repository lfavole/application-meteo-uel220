const OPENWEATHERMAP_API_KEY = "5f7735d8f11251dfc23cc45e49480ecd";

window.addEventListener("DOMContentLoaded", () => {
    const afficherErreur = (err) => {
        alert(err);
    };

    const rechercheVilleForm = document.getElementById("recherche-ville");
    const boutonRecherche = rechercheVilleForm.querySelector('input[type="submit"]');

    const resultatsRecherche = document.getElementById("resultats-recherche");
    const resultatsRechercheListe = resultatsRecherche.querySelector("ul");

    rechercheVilleForm.addEventListener("submit", async e => {
        e.preventDefault();
        resultatsRecherche.style.display = "none";
        boutonRecherche.value = "Recherche...";
        boutonRecherche.disabled = true;
        for (const bouton of rechercheVilleForm["type-recherche"])
            bouton.disabled = true;
        try {
            const typeRecherche = rechercheVilleForm["type-recherche"].value;
            const ville = rechercheVilleForm.ville.value.trim();
            const latitude = rechercheVilleForm.latitude.value;
            const longitude = rechercheVilleForm.longitude.value;
            let data;
            if (typeRecherche == "nom") {
                if (!ville) {
                    afficherErreur("Veuillez renseigner une ville.");
                    return;
                }
                const resp = await fetch(
                    "https://api.openweathermap.org/geo/1.0/direct?q=" + encodeURIComponent(ville) + "&limit=5&appid=" + encodeURIComponent(OPENWEATHERMAP_API_KEY)
                );
                data = await resp.json();
            } else if (typeRecherche == "coordonnees") {
                if (!latitude || !longitude) {
                    afficherErreur('Veuillez renseigner une latitude et une longitude, ou cliquer sur le bouton "Utiliser ma position actuelle".');
                    return;
                }
                const resp = await fetch(
                    "https://api.openweathermap.org/geo/1.0/reverse?lat=" + encodeURIComponent(latitude) + "&lon=" + encodeURIComponent(longitude) + "&limit=5&appid=" + encodeURIComponent(OPENWEATHERMAP_API_KEY)
                );
                data = await resp.json();
            } else {
                afficherErreur("Type de recherche invalide.");
                return;
            }
            resultatsRechercheListe.textContent = "";
            const langue = navigator.language.split("-")[0];
            for (const resultat of data) {
                const resultatLi = document.createElement("li");
                const resultatLien = document.createElement("a");
                resultatLien.href = "#";
                resultatLien.textContent = (
                    resultat.name
                    + (resultat.local_names && resultat.local_names[langue] != resultat.name ? " (" + resultat.local_names[langue] + ")" : "")
                    + (resultat.state ? ", " + resultat.state : "")
                    + ", " + resultat.country
                );
                resultatLien.addEventListener("click", e => {
                    e.preventDefault();
                    // TODO
                });
                resultatLi.append(resultatLien);
                resultatsRechercheListe.append(resultatLi);
            }
            resultatsRecherche.style.display = "";
        } catch (e) {
            afficherErreur(e);
        } finally {
            boutonRecherche.value = "Rechercher";
            boutonRecherche.disabled = false;
            for (const bouton of rechercheVilleForm["type-recherche"])
                bouton.disabled = false;
        }
    });

    const positionActuelleBouton = document.getElementById("position-actuelle");
    positionActuelleBouton.addEventListener("click", e => {
        e.preventDefault();
        positionActuelleBouton.value = "Localisation...";
        positionActuelleBouton.disabled = true;
        const restaurerBouton = () => {
            positionActuelleBouton.value = "Utiliser ma position actuelle";
            positionActuelleBouton.disabled = false;
        }
        navigator.geolocation.getCurrentPosition(
            // En cas de réussite
            position => {
                restaurerBouton();
                rechercheVilleForm["type-recherche"].value = "coordonnees";
                rechercheVilleForm.latitude.value = position.coords.latitude;
                rechercheVilleForm.longitude.value = position.coords.longitude;
                // On simule un clic sur le bouton pour déclencher l'événement submit
                // (ce que la fonction submit() ne fait pas)
                rechercheVilleForm.querySelector('input[type="submit"]').click();
            },
            // En cas d'erreur
            err => {
                restaurerBouton();
                afficherErreur(err.message);
            },
        );
    });
});
