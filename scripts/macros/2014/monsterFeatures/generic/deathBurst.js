async function death({trigger}) {
    await trigger.entity.use();
}
export let deathBurst = {
    name: 'Death Burst',
    translation: 'CHRISPREMADES.Macros.DeathBurst.Name',
    version: '2.3.0',
    death: [
        {
            pass: 'dead',
            macro: death,
            priority: 50
        }
    ],
    isGenericFeature: true,
    genericConfig: []
};
