// controllers/usersController.js
"use strict";

/**
 * Listing 18.11 (p. 271)
 * userController.js에서 인덱스 액션 생성과 index 액션의 재방문
 */
const passport = require("passport"),
  httpStatus = require("http-status-codes"), // Lesson 27.3 HTTP 상태 코드 요청
  User = require("../models/User"), // 사용자 모델 요청
  jsonWebToken = require("jsonwebtoken"), // Lesson 28.3 JSON Web Token 패키지 요청
  token = process.env.TOKEN || "nodeT0k3n"; // 토큰을 환경 변수로부터 가져오거나 기본값 설정

/**
 * Listing 22.3 (p. 328)
 * userController.js에서 create액션이 플래시 메시지를 추가
 *
 * [노트] getUserParams는 이전 캡스톤 프로젝트 (21장)에서 사용돼 왔다. 이 함수는 컨트롤러를 통해
 * 재사용돼 사용자 속성을 하나의 객체로 구성한다. 동일한 함수를 다른 모델 컨트롤러에도 구성해야 한다.
 */
const getUserParams = (body) => {
  return {
    username: body.username,
    name: {
      first: body.first,
      last: body.last,
    },
    email: body.email,
    password: body.password,
    profileImg: body.profileImg,
  };
};

module.exports = {
  /**
   * Listing 28.1, 3 (p. 407, 410)
   * usersController.js에서 API 토큰의 검증을 위한 미들웨어 함수의 추가
   */
  verifyToken: (req, res, next) => {
    let token = req.query.apiToken; // 쿼리 매개변수로부터 API 토큰 수집
    console.log("Verifying: ", token);
    if (token) {
      User.findOne({ apiToken: token }) // API 토큰을 사용해 사용자 찾기
        .then((user) => {
          if (user) {
            next(); // 토큰이 일치하면 next 미들웨어 호출
          } else {
            next(new Error("Invalid API token!")); // 일치하지 않으면 에러 메시지로 응답
          }
        })
        .catch((error) => {
          next(new Error(error.message)); // 에러 메시지로 응답
        });
    } else {
      next(new Error("No API token!")); // 일치하지 않으면 에러 메시지로 응답
    }
  },

  /**
   * Listing 28.4 (p. 413)
   * @TODO: usersController.js에서 API를 위한 로그인 액션 생성
   */
  apiAuthenticate: (req, res, next) => {
    passport.authenticate("local", (errors, user) => {
      if (user) {
        console.log("Houston, we have a user!", user);
        let signedToken = jsonWebToken.sign(
          {
            data: user._id,
            exp: new Date().setDate(new Date().getDate() + 1),
          },
          "secret_encoding_passphrase"
        ); // 사용자 ID와 만료 시간을 사용해 토큰 서명
        res.json({
          success: true,
          message: "Success authenticating user!",
        }); // 토큰을 JSON으로 응답
      } else {
        console.log("Houston, we have a problem!");
        res.json({
          success: false,
          message: "Could not authenticate user.",
        }); // 인증 실패 시 메시지로 응답
      }
    })(req, res, next);
  },

  /**
   * Listing 28.6 (p. 414-415)
   * userController.js에서 API를 위한 유효성 체크 액션 생성
   */
  verifyJWT: (req, res, next) => {
    let token = req.headers.token; // 헤더로부터 토큰 수집
    console.log(req.headers);
    if (token) {
      jsonWebToken.verify(
        token,
        "secret_encoding_passphrase",
        (errors, payload) => {
          if (payload) {
            User.findById(payload.data).then((user) => {
              if (user) {
                next(); // 사용자가 존재하면 next 미들웨어 호출
              } else {
                res.status(httpStatus.FORBIDDEN).json({
                  error: true,
                  message: "No user account found.",
                }); // 사용자가 없으면 에러 메시지로 응답
              }
            });
          } else {
            res.status(httpStatus.UNAUTHORIZED).json({
              error: true,
              message: "Cannot verify API token.",
            }); // 토큰이 일치하지 않으면 에러 메시지로 응답
            next();
          }
        }
      );
    } else {
      res.status(httpStatus.UNAUTHORIZED).json({
        error: true,
        message: "Provide Token.",
      }); // 토큰이 없으면 에러 메시지로 응답
    }
  },

  /**
   * Listing 23.3 (p. 336)
   * userController.js로의 로그인과 인증 액션 추가
   */
  login: (req, res) => {
    res.render("users/login", {
      page: "login",
      title: "Login",
    });
  },

  setReferer: (req, res, next) => {
    res.locals.redirect = req.headers.referer;
    next();
  },

  /**
   * Listing 24.5 (p. 356)
   * usersController.js에서 passport 인증 미들웨어 추가
   * 원래 있는 코드는 다 지우고 아래 코드로 대체
   */
  // local strategy로 사용자를 인증하기 위해 passport 호출
  authenticate: passport.authenticate("local", {
    // 성공, 실패의 플래시 메시지를 설정하고 사용자의 인중 상태에 따라 리디렉션할 경로를 지정한다
    failureRedirect: "/users/login",
    failureFlash: "Failed to login.",
    successRedirect: "/chat",
    successFlash: "Logged in!",
  }), // passport의 authenticate 메소드를 사용해 사용자 인증

  /**
   * Listing 24.8 (p. 359)
   * usersController.js에서 logout 액션 추가
   */
  logout: (req, res, next) => {
    req.logout(() => {
      console.log("Logged out!");
    }); // passport의 logout 메소드를 사용해 사용자 로그아웃
    req.flash("success", "You have been logged out!"); // 로그아웃 성공 메시지
    res.locals.redirect = "/"; // 홈페이지로 리디렉션
    next();
  },

  index: (req, res, next) => {
    User.find() // index 액션에서만 퀴리 실행
      .then((users) => {
        // 사용자 배열로 index 페이지 렌더링
        res.locals.users = users; // 응답상에서 사용자 데이터를 저장하고 다음 미들웨어 함수 호출
        next();
      })
      .catch((error) => {
        // 로그 메시지를 출력하고 홈페이지로 리디렉션
        console.log(`Error fetching users: ${error.message}`);
        next(error); // 에러를 캐치하고 다음 미들웨어로 전달
      });
  },
  indexView: (req, res) => {
    /*
     * Listing 26.3 (p. 384)
     * @TODO: userController.js에서 쿼리 매개변수가 존재할 때 JSON으로 응답하기
     */
    if (req.query.format === "json") {
      res.json(res.locals.users);
    } else {
      res.render("users/index", {
        page: "users",
        title: "All Users",
        // flashMessages: {
        //   // Listing 22.6 (p. 331) - 렌더링된 인덱스 뷰에서 플래시 메시지를 추가
        //   success: "Loaded all users!",
        // },
      }); // 분리된 액션으로 뷰 렌더링
    }
  },

  /**
   * 노트: 구독자 컨트롤러에서 index 액션이 getAllSubscribers를 대체한다. main.js에서 액션 관련
   * 라우트 index를 가리키도록 수정하고 subscribers.ejs를 index.ejs로 변경된 점을 기억하자. 이
   * 뷰는 views 폴더 아래 subscribers 폴더에 있어야 한다.
   */

  /**
   * Listing 19.2 (p. 278)
   * userController.js에 액션 생성 추가
   */
  // 폼의 렌더링을 위한 새로운 액션 추가
  new: (req, res) => {
    res.render("users/new", {
      page: "new-user",
      title: "New User",
    });
  },

  /**
   * Listing 22.3 (p. 328)
   * userController.js에서 create액션이 플래시 메시지를 추가
   *
   * [노트] 플래시 메시지를 임시로 저장하기 위해 요청 객체를 사용했지만, 응답에서의 로컬 변수와 이
   * 메시지들을 연결했기 때문에 메시지들은 결국 응답 객체로 연결된다.
   */
  create: (req, res, next) => {
    if (req.skip) next(); // 유효성 체크를 통과하지 못하면 다음 미들웨어 함수로 전달

    let newUser = new User(getUserParams(req.body)); // Listing 22.3 (p. 328)

    /**
     * Listing 24.4 (p. 355)
     * usersController.js에서 create 액션에서의 새로운 사용자 등록
     * 원래 있는 코드는 다 지우고 아래 코드로 대체
     */
    User.register(newUser, req.body.password, (error, user) => {
      // 새로운 사용자 등록
      if (user) {
        // 새로운 사용자가 등록되면
        req.flash(
          "success",
          `${user.fullName}'s account created successfully!`
        ); // 플래시 메시지를 추가하고
        res.locals.redirect = "/users"; // 사용자 인덱스 페이지로 리디렉션
        next();
      } else {
        // 새로운 사용자가 등록되지 않으면
        req.flash(
          "error",
          `Failed to create user account because: ${error.message}.`
        ); // 에러 메시지를 추가하고
        res.locals.redirect = "/users/new"; // 사용자 생성 페이지로 리디렉션
        next();
      }
    });
  },

  /**
   * Listing 23.7 (p. 346)
   * userController.js에서 validate 액션 추가
   */
  validate: (req, res, next) => {
    // 사용자가 입력한 이메일 주소가 유효한지 확인
    req
      .sanitizeBody("email")
      .normalizeEmail({
        all_lowercase: true,
      })
      .trim(); // trim()으로 whitespace 제거
    req.check("email", "Email is invalid").isEmail();
    // req
    //   .check("zipCode", "Zip code is invalid")
    //   .notEmpty()
    //   .isInt()
    //   .isLength({
    //     min: 5,
    //     max: 5,
    //   })
    //   .equals(req.body.zipCode); // zipCode 값의 유효성 체크
    req.check("password", "Password cannot be empty").notEmpty(); // password 필드 유효성 체크

    // 사용자가 입력한 비밀번호가 일치하는지 확인
    req.getValidationResult().then((error) => {
      // 앞에서의 유효성 체크 결과 수집
      if (!error.isEmpty()) {
        let messages = error.array().map((e) => e.msg);
        req.skip = true; // skip 속성을 true로 설정
        req.flash("error", messages.join(" and ")); // 에러 플래시 메시지로 추가
        res.locals.redirect = "/users/new"; // new 뷰로 리디렉션 설정
        next();
      } else {
        next(); // 다음 미들웨어 함수 호출
      }
    });
  },
  /**
   * [노트] 폼 데이터를 다시 채우기 위해 다양한 방법을 선택할 수 있다. (연구해보면)
   * 어떤 패키지가 효과적인지 알게 될 것이다. 자신에게 가장 적합한 방법을 찾으면
   * 데이터를 다시 처리하도록 애플리케이션의 모든 폼을 변경하라.
   */

  // 분리된 redirectView 액션에서 뷰 렌더링
  redirectView: (req, res, next) => {
    let redirectPath = res.locals.redirect;
    if (redirectPath) res.redirect(redirectPath);
    else next();
  },

  /**
   * 노트: 구독자 컨트롤러에 new와 create 액션을 추가하는 것은 새로운 CRUD 액션을 맞춰
   * getAllSubscribers와 saveSubscriber 액션을 삭제할 수 있다는 의미다. 게다가 홈
   * 컨트롤러에서 할 것은 홈페이지인 index.ejs 제공밖에 없다.
   */

  /**
   * Listing 19.7 (p. 285)
   * userController.js에서 특정 사용자에 대한 show 액션 추가
   */
  show: (req, res, next) => {
    let userId = req.params.id; // request params로부터 사용자 ID 수집
    User.findById(userId) // ID로 사용자 찾기
      .then((user) => {
        res.locals.user = user; // 응답 객체를 통해 다음 믿들웨어 함수로 사용자 전달
        next();
      })
      .catch((error) => {
        console.log(`Error fetching user by ID: ${error.message}`);
        next(error); // 에러를 로깅하고 다음 함수로 전달
      });
  },

  // show 뷰의 렌더링
  showView: (req, res) => {
    res.render("users/show", {
      page: "user-details",
      title: "User Details",
    });
  },

  /**
   * Listing 20.6 (p. 294)
   * edit와 update 액션 추가
   */
  // edit 액션 추가
  edit: (req, res, next) => {
    let userId = req.params.id;
    User.findById(userId) // ID로 데이터베이스에서 사용자를 찾기 위한 findById 사용
      .then((user) => {
        res.render("users/edit", {
          user: user,
          page: "edit-user",
          title: "Edit User",
        }); // 데이터베이스에서 내 특정 사용자를 위한 편집 페이지 렌더링
      })
      .catch((error) => {
        console.log(`Error fetching user by ID: ${error.message}`);
        next(error);
      });
  },

  // update 액션 추가
  update: (req, res, next) => {
    let userId = req.params.id,
      userParams = getUserParams(req.body);

    User.findByIdAndUpdate(userId, {
      $set: userParams,
    }) //ID로 사용자를 찾아 단일 명령으로 레코드를 수정하기 위한 findByIdAndUpdate의 사용
      .then((user) => {
        res.locals.redirect = `/users/${userId}`;
        res.locals.user = user;
        next(); // 지역 변수로서 응답하기 위해 사용자를 추가하고 다음 미들웨어 함수 호출
      })
      .catch((error) => {
        console.log(`Error updating user by ID: ${error.message}`);
        next(error);
      });
  },

  /**
   * Listing 20.9 (p. 298)
   * delete 액션의 추가
   */
  delete: (req, res, next) => {
    let userId = req.params.id;
    User.findByIdAndRemove(userId) // findByIdAndRemove 메소드를 이용한 사용자 삭제
      .then(() => {
        res.locals.redirect = "/users";
        next();
      })
      .catch((error) => {
        console.log(`Error deleting user by ID: ${error.message}`);
        next();
      });
  },
};
