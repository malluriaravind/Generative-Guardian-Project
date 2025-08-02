
const generatePassword = (): string => {
    const criterias: string[] = [
        '1234567890',
        'abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        '$#%&()',
    ];
    const result: string[] = [];
    for (var i = 0; i < 3; i += 1) {
        criterias.forEach(el => result.push(el.charAt(Math.ceil(Math.random() * el.length))));
    }
    return result.join('');
};

export { generatePassword };