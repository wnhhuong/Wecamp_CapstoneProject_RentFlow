import bcrypt from "bcrypt";

const salt = await bcrypt.genSalt(Number(process.env.SALT));

const hashFunction = async (password: string) => {
    return await bcrypt.hash(password, salt);
};

export default hashFunction;