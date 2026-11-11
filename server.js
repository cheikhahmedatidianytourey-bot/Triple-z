const express = require('express');
const axios = require('axios');
const app = express();

// Render fournit automatiquement la variable PORT
const PORT = process.env.PORT || 3000;

// Configuration PayTech / Clés d'API
const PAYTECH_API_KEY = process.env.PAYTECH_API_KEY || "VOTRE_PAYTECH_API_KEY";
const PAYTECH_SECRET_KEY = process.env.PAYTECH_SECRET_KEY || "VOTRE_PAYTECH_SECRET_KEY";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- BASE DE DONNÉES DES PLANS WEMAD Z^Z ---
const PLANS = {
    free: {
        id: "free",
        name: "Plan Gratuit Permanent",
        price_xof: 0,
        price_usd: 0,
        specs: "0.1 CPU, 512 MB RAM",
        features: ["Accès de base", "Support communautaire"]
    },
    starter: {
        id: "starter",
        name: "Plan Starter",
        price_xof: 4500,
        price_usd: 7,
        specs: "0.5 CPU, 512 MB RAM",
        features: ["Traitements prioritaires", "Support par email"]
    },
    pro: {
        id: "pro",
        name: "Plan Pro",
        price_xof: 16000,
        price_usd: 25,
        specs: "1 CPU, 2 GB RAM",
        features: ["Ressources dédiées", "API illimitée", "Support 24/7"]
    },
    enterprise: {
        id: "enterprise",
        name: "Plan Entreprise",
        price_xof: 55000,
        price_usd: 85,
        specs: "2 CPU, 4 GB RAM",
        features: ["Haute disponibilité", "Serveur sur-mesure", "Account Manager"]
    }
};

// Route d'accueil
app.get('/', (req, res) => {
    res.status(200).json({
        app: "WEMAD Z^Z",
        status: "En ligne",
        version: "1.0.0",
        message: "Bienvenue sur le serveur principal WEMAD Z^Z"
    });
});

// Route 1 : Récupérer les plans
app.get('/api/plans', (req, res) => {
    res.status(200).json({
        success: true,
        plans: Object.values(PLANS)
    });
});

// Route 2 : Initier un paiement PayTech
app.post('/api/pay', async (req, res) => {
    try {
        const { planId, customerEmail, customerPhone } = req.body;
        const selectedPlan = PLANS[planId];

        if (!selectedPlan) {
            return res.status(400).json({ success: false, error: "Plan inexistant." });
        }

        if (selectedPlan.price_xof === 0) {
            return res.status(200).json({
                success: true,
                message: "Le plan sélectionné est gratuit. Aucun paiement requis.",
                plan: selectedPlan
            });
        }

        const ref_command = `WEMAD_${Date.now()}_${planId}`;

        const response = await axios.post(
            'https://paytech.sn/api/payment/request-payment',
            {
                item_name: `Abonnement WEMAD Z^Z - ${selectedPlan.name}`,
                item_price: selectedPlan.price_xof,
                currency: 'XOF',
                ref_command: ref_command,
                command_name: `Abonnement ${selectedPlan.name}`,
                env: process.env.NODE_ENV === 'production' ? 'prod' : 'test',
                ipn_url: `${req.protocol}://${req.get('host')}/api/payment/ipn`,
                success_url: `${req.protocol}://${req.get('host')}/payment/success`,
                cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel`,
                custom_field: JSON.stringify({ planId, customerEmail, customerPhone })
            },
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'API_KEY': PAYTECH_API_KEY,
                    'API_SECRET': PAYTECH_SECRET_KEY
                }
            }
        );

        if (response.data && response.data.success === 1) {
            return res.status(200).json({
                success: true,
                redirect_url: response.data.redirect_url,
                ref_command: ref_command
            });
        } else {
            return res.status(500).json({
                success: false,
                error: "Erreur d'initialisation auprès du processeur de paiement."
            });
        }

    } catch (error) {
        console.error("Erreur Paiement:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: "Erreur serveur lors du traitement." });
    }
});

// Route 3 : Webhook IPN PayTech
app.post('/api/payment/ipn', (req, res) => {
    const { type_event, ref_command, item_price } = req.body;
    console.log(`[IPN Notification] Evénement: ${type_event} | Commande: ${ref_command}`);

    if (type_event === 'sale_complete') {
        console.log(`Paiement de ${item_price} XOF validé pour ${ref_command}`);
    }

    res.status(200).send("OK");
});

// Pages de retour
app.get('/payment/success', (req, res) => {
    res.send("<h1>Paiement Réussi !</h1><p>Votre abonnement WEMAD Z^Z a été activé avec succès.</p>");
});

app.get('/payment/cancel', (req, res) => {
    res.send("<h1>Paiement Annulé</h1><p>La transaction a été annulée.</p>");
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur WEMAD Z^Z prêt sur le port ${PORT}`);
});
