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
    chargerMeteo(resultat.lat, resultat.lon, resultat.name, resultat.country);
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
    
    // ========== PARTIE SOULAYMAN ==========

    async function chargerMeteo(lat, lon, nomVille, pays) {
        try {
            const [meteo, previsions, air] = await Promise.all([
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${OPENWEATHERMAP_API_KEY}`).then(r => r.json()),
                fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${OPENWEATHERMAP_API_KEY}`).then(r => r.json()),
                fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}`).then(r => r.json())
            ]);

            afficherMeteoActuelle(meteo, nomVille, pays);
            afficherQualiteAir(air);
            afficherPrevisions(previsions);
        } catch (err) {
            afficherErreur("Erreur lors du chargement des données météo.");
            console.error(err);
        }
    }

    function afficherMeteoActuelle(data, nomVille, pays) {
        document.getElementById("nom-ville").textContent = `${nomVille}, ${pays}`;
        document.getElementById("date-actuelle").textContent = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
        document.getElementById("icone-meteo").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        document.getElementById("icone-meteo").alt = data.weather[0].description;
        document.getElementById("temperature").textContent = Math.round(data.main.temp) + " °C";
        document.getElementById("description").textContent = data.weather[0].description;
        document.getElementById("ressenti").textContent = Math.round(data.main.feels_like) + " °C";
        document.getElementById("humidite").textContent = data.main.humidity + " %";
        document.getElementById("vent").textContent = Math.round(data.wind.speed * 3.6) + " km/h";
        document.getElementById("pression").textContent = data.main.pressure + " hPa";
        document.getElementById("meteo-actuelle").style.display = "";
    }

    function afficherQualiteAir(data) {
        const aqi = data.list[0].main.aqi;
        const c = data.list[0].components;
        const labels = { 1: "Bonne", 2: "Correcte", 3: "Moyenne", 4: "Mauvaise", 5: "Très mauvaise" };
        document.getElementById("aqi-valeur").textContent = aqi;
        document.getElementById("aqi-label").textContent = labels[aqi] || "Inconnue";
        document.getElementById("pm25").textContent = c.pm2_5.toFixed(1) + " µg/m³";
        document.getElementById("pm10").textContent = c.pm10.toFixed(1) + " µg/m³";
        document.getElementById("no2").textContent = c.no2.toFixed(1) + " µg/m³";
        document.getElementById("o3").textContent = c.o3.toFixed(1) + " µg/m³";
        document.getElementById("qualite-air").style.display = "";
    }

    function afficherPrevisions(data) {
        const conteneur = document.getElementById("liste-previsions");
        conteneur.innerHTML = "";
        const parJour = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const cle = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
            if (!parJour[cle]) parJour[cle] = [];
            parJour[cle].push(item);
        });
        for (const [jour, items] of Object.entries(parJour)) {
            const bloc = document.createElement("div");
            const titre = document.createElement("h3");
            titre.textContent = jour.charAt(0).toUpperCase() + jour.slice(1);
            bloc.appendChild(titre);
            const liste = document.createElement("ul");
            items.forEach(item => {
                const date = new Date(item.dt * 1000);
                const li = document.createElement("li");
                li.innerHTML = `<strong>${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>
                    <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="40">
                    ${Math.round(item.main.temp)} °C — ${item.weather[0].description}`;
                liste.appendChild(li);
            });
            bloc.appendChild(liste);
            conteneur.appendChild(bloc);
        }
        document.getElementById("previsions").style.display = "";
    }
});
