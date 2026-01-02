use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    pub static ref PASSWORD_REGEX: Regex =
        Regex::new(r"^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$").unwrap();
}
