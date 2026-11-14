async function use({dialog}) {
    dialog.configure = false;
}
export let noConfiguration = {
    name: 'No Configuration',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'preTargeting',
                macro: use,
                priority: 10
            }
        ]
    }
};
