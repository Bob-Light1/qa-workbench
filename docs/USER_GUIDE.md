# Guide d’utilisation

QA Workbench conserve les fiches de test, les résultats et le suivi des corrections.
L’adresse de connexion vérifiée figure dans le [README](../README.md).

## Préparer la première campagne

L’administrateur active son accès avec le lien individuel fourni séparément, puis
choisit son mot de passe. Aucun compte ChatGPT n’est nécessaire. Un lien expiré
ou déjà utilisé doit être remplacé par le responsable de l’installation.

1. Choisir le projet **ERP multi-campus**. Les dix fiches initiales sont dans
   **Fiches de test**. Le projet de validation technique contient uniquement des
   exemples synthétiques ; il sert à vérifier le Workbench lui-même.
2. Dans **Campagnes**, cliquer sur **Nouvelle campagne**. Indiquer un nom,
   l’environnement et la version ou le commit de chaque brique ; écrire
   « non concernée » pour une brique absente du périmètre.
3. Sélectionner les fiches à tester et créer la campagne. Ses instructions sont
   alors figées : modifier une fiche ne change pas les anciennes campagnes.
4. Dans **Équipe**, cliquer sur **Inviter un testeur**, choisir son rôle et
   préparer son accès. Transmettre le lien uniquement à la personne concernée.
   Aucun e-mail n’est envoyé automatiquement. Un compte existant conserve son
   mot de passe. Affecter ensuite les fiches aux testeurs si nécessaire.

Le Workbench en ligne ne rend pas l’ERP local accessible depuis un autre ordinateur.
Chaque testeur doit pouvoir ouvrir l’environnement ERP indiqué dans la campagne.
Utiliser des données synthétiques et fournir les identifiants séparément des fiches.

## Exécuter une fiche en une courte session

Ouvrir une campagne, puis une fiche affectée à son compte ou non affectée.
Vérifier les prérequis avant de commencer. Pour comparer plusieurs rôles ERP,
utiliser des profils ou contextes de navigateur séparés.

Suivre chaque action et comparer le résultat attendu au comportement observé.
Les dix minutes sont une estimation, sans arrêt forcé ni garantie de couverture
complète. Noter les étapes vérifiées, l’observation et le temps passé.

Cliquer sur **Enregistrer le brouillon** avant de fermer la fenêtre ou de changer
d’appareil. Saisir du texte seul ne l’enregistre pas. Un brouillon enregistré peut
être repris après rechargement ou sur un autre appareil.

Choisir le verdict, puis **Valider le résultat** :

- **Réussi** : les résultats attendus sont obtenus.
- **Échoué** : le produit se comporte autrement que prévu.
- **Bloqué** : un prérequis ou l’environnement empêche la vérification.
- **Non exécuté** : le test n’a volontairement pas été réalisé ; expliquer pourquoi.

Joindre si utile des images PNG, JPEG ou WebP, de 5 Mo maximum chacune. Une capture
« En attente » n’est pas une preuve enregistrée : confirmer l’envoi après reprise,
ou annuler l’entrée avant de recommencer. Terminer ou annuler les envois en attente
avant de finaliser. Ne jamais joindre de mot de passe, lien d’invitation ou donnée
personnelle réelle. Les captures restent privées aux membres du projet.

## Lire la couverture d’un chantier

Dans **Fiches de test**, choisir **Couverture roadmap**. Les fiches actives sont
regroupées selon leur référence roadmap actuelle. La recherche accepte aussi une
référence, un domaine ou une brique. Les fiches sans référence restent visibles
dans **Sans référence roadmap** ; les fiches archivées ne sont pas comptées.

Choisir une campagne pour limiter les résultats à cet environnement. **Toutes les
campagnes** affiche le dernier résultat soumis de la version actuelle de chaque
fiche, avec sa campagne, l’environnement et les versions techniques. Un brouillon
ne compte pas comme résultat. **À exécuter** désigne une version actuelle présente
en campagne sans résultat soumis ; **Hors campagne** indique qu’elle n’y est pas
encore planifiée.

Après modification d’une fiche, **À réexécuter** conserve l’ancien verdict et sa
version sans valider les nouvelles consignes. Créer une nouvelle campagne avec la
version actuelle pour la tester. Cliquer sur une fiche permet de la consulter ou
de la modifier avec les droits nécessaires.

Cette vue montre les fiches liées aux chantiers renseignés. Elle ne recense pas les
chantiers sans fiche et ne prononce pas la validation d’un chantier ERP. Les fiches
ERP-011 à ERP-013 peuvent être importées séparément par le responsable, selon la
commande de [contribution](CONTRIBUTING.md). Leur import ne constitue pas une
exécution des tests ERP.

## Signaler un problème et vérifier la correction

Depuis un résultat validé, créer un signalement. Choisir **Anomalie produit**,
**Suggestion**, **Erreur de fiche** ou **Problème d’environnement**. Préciser l’étape,
le comportement observé et les conditions de reproduction. Le contexte attendu
reste disponible dans l’exécution et les instructions de la campagne.

Le rédacteur ou l’administrateur ouvre **Signalements**, consulte l’exécution et
ses captures, puis renseigne la correction, le commit ou la décision. Le statut
« Corrigé » ne prouve pas que la correction fonctionne.

Dans la campagne, cliquer sur **Revérifier** et enregistrer un nouveau résultat.
L’échec précédent reste dans l’historique. Pour vérifier ou clôturer une anomalie
produit, sélectionner dans son suivi une vérification réussie plus récente de la
même fiche de campagne. Archiver une campagne conserve ses résultats.

En cas de modification concurrente, actualiser et comparer les informations avant
de recommencer. Une erreur réseau doit rester une erreur : vérifier l’état enregistré
avant de répéter l’action.

## Conserver le suivi et retrouver son accès

Les administrateurs exportent le projet et les captures depuis **Équipe**, après
une campagne importante. Conserver l’archive dans un emplacement privé distinct.
La [procédure d’exploitation](OPERATIONS.md) décrit la restauration et la reprise
après une pause de l’hébergement gratuit. Les sauvegardes ne sont pas automatiques.

En cas de mot de passe oublié, demander un nouveau lien individuel au responsable
de l’installation. Chaque personne choisit son mot de passe ; aucun mot de passe
n’est affiché par l’application. Utiliser **Se déconnecter** en fin de session,
y compris sur mobile.
